/**
 * Core Organ Matching Engine (OrganEase)
 * Implements multi-factor algorithmic scoring:
 * 1. Blood Group Matching (ABO Compatibility Matrix)
 * 2. Organ Type & Clinical Urgency Prioritization
 * 3. Medical Priority Scoring (MELD / NYHA / HLA tissue typing / CIT feasibility / Distance)
 */

// Blood Group Compatibility Matrix
const ABO_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'] // Universal recipient only
};

// Organ Cold Ischemia Time Max Thresholds (in hours)
const ORGAN_CIT_LIMITS = {
  'Heart': { optimal: 4, absoluteMax: 6 },
  'Lung': { optimal: 6, absoluteMax: 8 },
  'Liver': { optimal: 10, absoluteMax: 12 },
  'Pancreas': { optimal: 12, absoluteMax: 18 },
  'Kidney': { optimal: 24, absoluteMax: 36 },
  'Cornea': { optimal: 48, absoluteMax: 72 }
};

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Check ABO and Rh blood group compatibility
 */
function evaluateBloodCompatibility(donorBlood, recipientBlood) {
  if (!donorBlood || !recipientBlood) return { compatible: false, score: 0, reason: 'Missing blood group' };
  
  const allowedRecipients = ABO_COMPATIBILITY[donorBlood] || [];
  const isCompatible = allowedRecipients.includes(recipientBlood);
  
  if (!isCompatible) {
    return {
      compatible: false,
      score: 0,
      reason: `Incompatible blood types: Donor ${donorBlood} cannot donate to Recipient ${recipientBlood}`
    };
  }
  
  // Exact match gets highest score; compatible match gets slight reduction
  if (donorBlood === recipientBlood) {
    return {
      compatible: true,
      score: 30, // 30/30 pts max
      reason: `Identical Blood Match: ${donorBlood} → ${recipientBlood}`
    };
  } else {
    return {
      compatible: true,
      score: 24, // 24/30 pts
      reason: `Permissible Compatible Blood Match: ${donorBlood} → ${recipientBlood}`
    };
  }
}

/**
 * Evaluate HLA Tissue Compatibility
 */
function evaluateHLAMatch(donorHLA = {}, recipientHLA = {}) {
  let matchedLoci = 0;
  let totalLoci = 0;
  const loci = ['hlaA', 'hlaB', 'hlaC', 'hlaDR', 'hlaDQ'];
  
  loci.forEach(locus => {
    if (donorHLA[locus] && recipientHLA[locus]) {
      totalLoci++;
      const donorAlleles = donorHLA[locus].split(',').map(s => s.trim());
      const recipientAlleles = recipientHLA[locus].split(',').map(s => s.trim());
      const hasIntersection = donorAlleles.some(a => recipientAlleles.includes(a));
      if (hasIntersection) matchedLoci++;
    }
  });
  
  const ratio = totalLoci > 0 ? (matchedLoci / totalLoci) : 0.5;
  const score = Math.round(ratio * 12); // up to 12 points
  return {
    score,
    matchedLoci,
    totalLoci,
    detail: `${matchedLoci}/${totalLoci} HLA Loci Concordance`
  };
}

/**
 * Evaluate Organ Cold Ischemia Time and Transit Feasibility
 */
function evaluateTransitCIT(donorCoords, recipientCoords, organType, harvestTime, maxCitHours) {
  const distanceKm = calculateHaversineDistance(
    donorCoords.latitude, donorCoords.longitude,
    recipientCoords.latitude, recipientCoords.longitude
  );
  
  // Green corridor speed estimation:
  // Air transport if > 220 km, else high-speed emergency ground corridor
  const isAirTransport = distanceKm > 220;
  const averageSpeedKmh = isAirTransport ? 220 : 90;
  const transitHours = (distanceKm / averageSpeedKmh) + 0.5; // +30m handover/prep
  const transitMinutes = Math.round(transitHours * 60);
  
  // Elapsed time since harvest
  const elapsedHours = harvestTime ? Math.max(0, (Date.now() - new Date(harvestTime).getTime()) / (1000 * 60 * 60)) : 0.5;
  const projectedTotalCitHours = elapsedHours + transitHours;
  
  const citLimits = ORGAN_CIT_LIMITS[organType] || { optimal: maxCitHours || 12, absoluteMax: (maxCitHours ? maxCitHours * 1.25 : 16) };
  const safeMarginHours = Math.max(0, citLimits.absoluteMax - projectedTotalCitHours);
  const citFeasible = projectedTotalCitHours <= citLimits.absoluteMax;
  
  let citScore = 0;
  if (!citFeasible) {
    citScore = 0;
  } else if (projectedTotalCitHours <= citLimits.optimal) {
    citScore = 12; // Max optimal
  } else {
    // Linear degradation between optimal and absoluteMax
    const fraction = safeMarginHours / (citLimits.absoluteMax - citLimits.optimal);
    citScore = Math.max(2, Math.round(fraction * 10));
  }
  
  return {
    distanceKm,
    estimatedTransitMinutes: transitMinutes,
    projectedTotalCitHours: Number(projectedTotalCitHours.toFixed(1)),
    safeCitMarginHours: Number(safeMarginHours.toFixed(1)),
    citFeasible,
    citScore,
    isAirTransport,
    detail: citFeasible 
      ? `Estimated CIT: ${projectedTotalCitHours.toFixed(1)}h / Max: ${citLimits.absoluteMax}h (${safeMarginHours.toFixed(1)}h safe margin)`
      : `CRITICAL CIT EXCEEDED: ${projectedTotalCitHours.toFixed(1)}h exceeds ${citLimits.absoluteMax}h limit`
  };
}

/**
 * Compute the complete Organ Matching Score between a Donor Organ and a Recipient Request
 */
function computeMatchScore(donorOrgan, recipientRequest, donorHospital, recipientHospital) {
  const notes = [];
  
  // 1. Organ Type Hard Filter
  if (donorOrgan.organType !== recipientRequest.organNeeded) {
    return {
      matchScore: 0,
      isCompatible: false,
      reason: `Organ mismatch: Donor has ${donorOrgan.organType}, recipient requires ${recipientRequest.organNeeded}`,
      scoreBreakdown: { bloodGroupScore: 0, urgencyScore: 0, hlaTissueScore: 0, citFeasibilityScore: 0, waitingListScore: 0, notes }
    };
  }
  
  // 2. Blood Group Compatibility (30 pts max)
  const bloodResult = evaluateBloodCompatibility(donorOrgan.bloodType, recipientRequest.bloodType);
  if (!bloodResult.compatible) {
    return {
      matchScore: 0,
      isCompatible: false,
      reason: bloodResult.reason,
      scoreBreakdown: { bloodGroupScore: 0, urgencyScore: 0, hlaTissueScore: 0, citFeasibilityScore: 0, waitingListScore: 0, notes: [bloodResult.reason] }
    };
  }
  notes.push(bloodResult.reason);
  
  // 3. Clinical Urgency & Pediatric Priority (35 pts max)
  let urgencyScore = 0;
  if (recipientRequest.urgencyLevel.includes('1A') || recipientRequest.urgencyLevel.includes('Emergency')) {
    urgencyScore = 32;
    notes.push('Status 1A Emergency Tier (+32 pts)');
  } else if (recipientRequest.urgencyLevel.includes('1B') || recipientRequest.urgencyLevel.includes('Urgent')) {
    urgencyScore = 24;
    notes.push('Status 1B Urgent Tier (+24 pts)');
  } else {
    urgencyScore = 14;
    notes.push('Status 2 Standard List (+14 pts)');
  }
  
  // Pediatric preference bonus
  if (recipientRequest.isPediatric || (donorOrgan.donorAge <= 18 && recipientRequest.patientAge <= 21)) {
    urgencyScore = Math.min(35, urgencyScore + 3);
    notes.push('Pediatric Allocation Priority (+3 pts)');
  }
  
  // 4. Medical Severity Index & HLA Tissue Typing (20 pts max)
  // Severity score (MELD / CPRA / NYHA) up to 8 pts
  const severityPoints = Math.min(8, Math.round(((recipientRequest.medicalSeverityScore || 20) / 40) * 8));
  const hlaResult = evaluateHLAMatch(donorOrgan.hlaTyping, recipientRequest.hlaTyping);
  const medicalHLAScore = severityPoints + hlaResult.score;
  notes.push(`${hlaResult.detail} (+${hlaResult.score} pts), Severity Index (+${severityPoints} pts)`);
  
  // 5. Cold Ischemia Time & Distance Feasibility (10 pts max)
  const citResult = evaluateTransitCIT(
    donorHospital.coordinates,
    recipientHospital.coordinates,
    donorOrgan.organType,
    donorOrgan.harvestTime,
    donorOrgan.maxColdIschemiaHours
  );
  notes.push(citResult.detail);
  
  if (!citResult.citFeasible) {
    notes.push('WARNING: Severe Cold Ischemia Time penalty applied');
  }
  
  // 6. Waiting List Time Points (5 pts max)
  const waitDays = Math.max(0, (Date.now() - new Date(recipientRequest.waitingListEntryDate).getTime()) / (1000 * 60 * 60 * 24));
  const waitPoints = Math.min(5, Math.round(waitDays / 30)); // +1 pt per month up to 5 pts
  if (waitPoints > 0) {
    notes.push(`Waitlist Duration: ${Math.round(waitDays)} days (+${waitPoints} pts)`);
  }
  
  // Total Composite Score calculation (0 to 100)
  const totalScore = Math.min(100, Math.max(0, 
    bloodResult.score + 
    urgencyScore + 
    medicalHLAScore + 
    citResult.citScore + 
    waitPoints
  ));
  
  return {
    matchScore: totalScore,
    isCompatible: citResult.citFeasible && totalScore >= 45,
    isRecommended: citResult.citFeasible && totalScore >= 70,
    distanceKm: citResult.distanceKm,
    estimatedTransitMinutes: citResult.estimatedTransitMinutes,
    safeCitMarginHours: citResult.safeCitMarginHours,
    citFeasible: citResult.citFeasible,
    scoreBreakdown: {
      bloodGroupScore: bloodResult.score,
      urgencyScore,
      hlaTissueScore: hlaResult.score,
      severityScore: severityPoints,
      citFeasibilityScore: citResult.citScore,
      waitingListScore: waitPoints,
      notes
    }
  };
}

module.exports = {
  computeMatchScore,
  evaluateBloodCompatibility,
  evaluateHLAMatch,
  evaluateTransitCIT,
  ORGAN_CIT_LIMITS,
  ABO_COMPATIBILITY
};
