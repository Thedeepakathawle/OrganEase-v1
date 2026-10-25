const express = require('express');
const router = express.Router();
const DonorOrgan = require('../models/DonorOrgan');
const RecipientRequest = require('../models/RecipientRequest');
const Hospital = require('../models/Hospital');
const Match = require('../models/Match');
const AuditRecord = require('../models/AuditRecord');
const { computeMatchScore } = require('../services/matchingEngine');
const { broadcastEmergencyMatchAlert } = require('../services/socketService');
const { encrypt, hashPayload, generateDeliveryKey } = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

/**
 * Execute matching engine for a specific Donor Organ against all waiting recipients
 */
async function runMatchingForDonorOrgan(donorOrganId) {
  const donorOrgan = await DonorOrgan.findById(donorOrganId).populate('hospital');
  if (!donorOrgan) return [];

  const waitingRecipients = await RecipientRequest.find({
    organNeeded: donorOrgan.organType,
    status: 'waiting'
  }).populate('hospital');

  const evaluatedMatches = [];

  for (const recipient of waitingRecipients) {
    if (!recipient.hospital) continue;

    const evaluation = computeMatchScore(
      donorOrgan,
      recipient,
      donorOrgan.hospital,
      recipient.hospital
    );

    if (evaluation.matchScore > 0) {
      // Find or create match record
      let match = await Match.findOne({
        donorOrgan: donorOrgan._id,
        recipientRequest: recipient._id
      });

      const deliveryKey = match ? match.deliveryKey : generateDeliveryKey();

      if (!match) {
        match = new Match({
          donorOrgan: donorOrgan._id,
          recipientRequest: recipient._id,
          donorHospital: donorOrgan.hospital._id,
          recipientHospital: recipient.hospital._id,
          matchScore: evaluation.matchScore,
          isRecommended: evaluation.isRecommended,
          scoreBreakdown: evaluation.scoreBreakdown,
          distanceKm: evaluation.distanceKm,
          estimatedTransitMinutes: evaluation.estimatedTransitMinutes,
          safeCitMarginHours: evaluation.safeCitMarginHours,
          citFeasible: evaluation.citFeasible,
          status: 'pending',
          deliveryKey
        });
      } else {
        match.matchScore = evaluation.matchScore;
        match.isRecommended = evaluation.isRecommended;
        match.scoreBreakdown = evaluation.scoreBreakdown;
        match.distanceKm = evaluation.distanceKm;
        match.estimatedTransitMinutes = evaluation.estimatedTransitMinutes;
        match.safeCitMarginHours = evaluation.safeCitMarginHours;
        match.citFeasible = evaluation.citFeasible;
      }

      await match.save();

      // Populate for socket broadcast and client response
      await match.populate(['donorOrgan', 'recipientRequest', 'donorHospital', 'recipientHospital']);
      evaluatedMatches.push(match);
    }
  }

  // Sort candidates by matchScore descending
  evaluatedMatches.sort((a, b) => b.matchScore - a.matchScore);

  // If a high-priority verified match is found (score >= 70 or Status 1A), trigger WebSocket alert!
  if (evaluatedMatches.length > 0) {
    const topMatch = evaluatedMatches[0];
    if (topMatch.matchScore >= 65 || topMatch.recipientRequest?.urgencyLevel.includes('1A')) {
      topMatch.status = 'alerted';
      await topMatch.save();
      
      broadcastEmergencyMatchAlert(topMatch);

      // Audit Record for Emergency Alert
      const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
      const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
      const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';
      
      const alertAuditPayload = {
        action: 'EMERGENCY_ALERT_TRIGGERED',
        matchId: topMatch._id,
        matchScore: topMatch.matchScore,
        organType: donorOrgan.organType,
        recipientCode: topMatch.recipientRequest.patientCode,
        urgency: topMatch.recipientRequest.urgencyLevel
      };
      
      const auditRecord = new AuditRecord({
        auditIndex,
        actionType: 'EMERGENCY_ALERT_TRIGGERED',
        matchId: topMatch._id,
        donorOrganId: donorOrgan._id,
        recipientRequestId: topMatch.recipientRequest._id,
        hospitalId: donorOrgan.hospital._id,
        performedBy: 'Core Organ Matching Engine (Automated WebSocket Alert Service)',
        encryptedDataPayload: encrypt(alertAuditPayload),
        previousHash,
        recordHash: hashPayload(alertAuditPayload, previousHash),
        complianceCertificateId: `CERT-ALT-${Date.now().toString(36).toUpperCase()}`
      });
      await auditRecord.save();
    }
  }

  return evaluatedMatches;
}

/**
 * Execute matching for a recipient against all available organs
 */
async function runMatchingForRecipient(recipientId) {
  const recipient = await RecipientRequest.findById(recipientId).populate('hospital');
  if (!recipient) return [];

  const availableOrgans = await DonorOrgan.find({
    organType: recipient.organNeeded,
    status: 'available'
  }).populate('hospital');

  const matches = [];
  for (const organ of availableOrgans) {
    const organMatches = await runMatchingForDonorOrgan(organ._id);
    const thisMatch = organMatches.find(m => m.recipientRequest._id.toString() === recipient._id.toString());
    if (thisMatch) matches.push(thisMatch);
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

/**
 * Trigger matching manually for an organ
 */
router.post('/trigger/:donorOrganId', async (req, res) => {
  try {
    const matches = await runMatchingForDonorOrgan(req.params.donorOrganId);
    res.json({
      success: true,
      message: `Matching engine executed. ${matches.length} compatible candidates evaluated.`,
      matches
    });
  } catch (err) {
    console.error('Trigger matching error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all matches
 */
router.get('/matches', async (req, res) => {
  try {
    const { status, organType } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('donorOrgan')
      .populate('recipientRequest')
      .populate('donorHospital')
      .populate('recipientHospital')
      .sort({ matchScore: -1 });

    const filtered = organType 
      ? matches.filter(m => m.donorOrgan?.organType === organType)
      : matches;

    res.json({ success: true, count: filtered.length, matches: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get specific match with full mathematical breakdown
 */
router.get('/matches/:matchId', async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('donorOrgan')
      .populate('recipientRequest')
      .populate('donorHospital')
      .populate('recipientHospital');

    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });
    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Accept a Match & Authorize Dispatch
 * Recipient/Donor medical teams accept the match.
 */
router.post('/accept/:matchId', authenticateToken, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('donorOrgan')
      .populate('recipientRequest')
      .populate('donorHospital')
      .populate('recipientHospital');

    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

    match.status = 'accepted';
    match.acceptedAt = new Date();
    await match.save();

    // Mark organ and recipient as matched
    await DonorOrgan.findByIdAndUpdate(match.donorOrgan._id, {
      status: 'matched',
      matchedRecipient: match.recipientRequest._id,
      activeMatchId: match._id,
      deliveryKey: match.deliveryKey
    });

    await RecipientRequest.findByIdAndUpdate(match.recipientRequest._id, {
      status: 'matched',
      activeMatchId: match._id
    });

    // Create Audit Record
    const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
    const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
    const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';
    
    const auditPayload = {
      action: 'MATCH_ACCEPTED',
      matchId: match._id,
      deliveryKey: match.deliveryKey,
      donorHospital: match.donorHospital.name,
      recipientHospital: match.recipientHospital.name,
      acceptedByUser: req.user.email
    };

    const auditRecord = new AuditRecord({
      auditIndex,
      actionType: 'MATCH_ACCEPTED',
      matchId: match._id,
      donorOrganId: match.donorOrgan._id,
      recipientRequestId: match.recipientRequest._id,
      hospitalId: match.recipientHospital._id,
      performedBy: req.user.email || 'Transplant Surgeon',
      encryptedDataPayload: encrypt(auditPayload),
      previousHash,
      recordHash: hashPayload(auditPayload, previousHash),
      complianceCertificateId: `CERT-ACC-${Date.now().toString(36).toUpperCase()}`
    });
    await auditRecord.save();

    res.json({
      success: true,
      message: 'Match formally accepted. Delivery key generated. Ready for green-corridor transit dispatch.',
      match,
      deliveryKey: match.deliveryKey
    });
  } catch (err) {
    console.error('Accept match error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = {
  router,
  runMatchingForDonorOrgan,
  runMatchingForRecipient
};
