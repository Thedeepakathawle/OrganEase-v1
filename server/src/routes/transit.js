const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const DonorOrgan = require('../models/DonorOrgan');
const TransitLog = require('../models/TransitLog');
const AuditRecord = require('../models/AuditRecord');
const { broadcastTransitTelemetry } = require('../services/socketService');
const { encrypt, hashPayload } = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

/**
 * Generate interpolated green corridor waypoints between origin and destination
 */
function generateWaypoints(origin, destination, count = 10) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const fraction = i / count;
    // Slight realistic curved deviation for road corridor
    const curve = Math.sin(fraction * Math.PI) * 0.04;
    points.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * fraction + curve,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * fraction,
      passed: i === 0
    });
  }
  return points;
}

/**
 * Dispatch an accepted match into Green Corridor Transit
 */
router.post('/dispatch/:matchId', authenticateToken, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('donorOrgan')
      .populate('donorHospital')
      .populate('recipientHospital');

    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

    match.status = 'in_transit';
    match.dispatchedAt = new Date();
    await match.save();

    await DonorOrgan.findByIdAndUpdate(match.donorOrgan._id, { status: 'in_transit' });

    const origin = match.donorHospital.coordinates;
    const dest = match.recipientHospital.coordinates;
    const waypoints = generateWaypoints(origin, dest, 12);

    const harvestTime = match.donorOrgan.harvestTime || new Date();
    const maxCitHours = match.donorOrgan.maxColdIschemiaHours || 6;
    const elapsedMinutes = Math.round((Date.now() - new Date(harvestTime).getTime()) / (1000 * 60));
    const remainingMinutes = Math.max(0, (maxCitHours * 60) - elapsedMinutes);

    let transitLog = await TransitLog.findOne({ match: match._id });
    if (!transitLog) {
      transitLog = new TransitLog({
        match: match._id,
        donorHospital: match.donorHospital._id,
        recipientHospital: match.recipientHospital._id,
        vehicleType: match.distanceKm > 200 ? 'Medical Dispatch Helicopter' : 'Emergency Ambulance (Green Corridor)',
        vehicleCallsign: `CORRIDOR-${match.donorOrgan.organType.toUpperCase()}-01`,
        dispatchOfficer: 'Captain M. Sterling (Regional Emergency Transit Command)',
        currentLocation: { latitude: origin.latitude, longitude: origin.longitude },
        originCoordinates: origin,
        destinationCoordinates: dest,
        waypoints,
        progressPercent: 0,
        speedKmh: match.distanceKm > 200 ? 210 : 95,
        temperatureCelsius: 3.4,
        batteryPercentage: 98,
        harvestTimestamp: harvestTime,
        maxCitHours,
        elapsedCitMinutes: elapsedMinutes,
        remainingCitMinutes: remainingMinutes,
        viabilityStatus: 'optimal',
        greenCorridorActive: true,
        status: 'dispatched'
      });
    } else {
      transitLog.status = 'dispatched';
      transitLog.progressPercent = 0;
      transitLog.currentLocation = origin;
    }

    await transitLog.save();

    // Create Audit Record for dispatch
    const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
    const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
    const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';
    
    const auditPayload = {
      action: 'GREEN_CORRIDOR_DISPATCHED',
      matchId: match._id,
      organType: match.donorOrgan.organType,
      vehicleCallsign: transitLog.vehicleCallsign,
      maxCitHours,
      remainingMinutes,
      dispatchedBy: req.user.email
    };

    const auditRecord = new AuditRecord({
      auditIndex,
      actionType: 'GREEN_CORRIDOR_DISPATCHED',
      matchId: match._id,
      donorOrganId: match.donorOrgan._id,
      hospitalId: match.donorHospital._id,
      performedBy: req.user.email || 'Logistics Coordinator',
      encryptedDataPayload: encrypt(auditPayload),
      previousHash,
      recordHash: hashPayload(auditPayload, previousHash),
      complianceCertificateId: `CERT-DSP-${Date.now().toString(36).toUpperCase()}`
    });
    await auditRecord.save();

    // Broadcast initial dispatch telemetry
    broadcastTransitTelemetry(match._id, {
      type: 'DISPATCH_STARTED',
      transitLog: transitLog.toObject()
    });

    res.json({
      success: true,
      message: 'Green Corridor activated. Live dispatch and Cold Ischemia Time monitoring initiated.',
      transitLog
    });
  } catch (err) {
    console.error('Dispatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get transit status and live telemetry
 */
router.get('/:matchId', async (req, res) => {
  try {
    const transitLog = await TransitLog.findOne({ match: req.params.matchId })
      .populate('donorHospital')
      .populate('recipientHospital')
      .populate({
        path: 'match',
        populate: ['donorOrgan', 'recipientRequest']
      });

    if (!transitLog) {
      return res.status(404).json({ success: false, message: 'Transit log not found for this match.' });
    }

    // Refresh dynamic CIT remaining in real time
    const elapsedMinutes = Math.round((Date.now() - new Date(transitLog.harvestTimestamp).getTime()) / (1000 * 60));
    const totalMaxMinutes = transitLog.maxCitHours * 60;
    const remainingMinutes = Math.max(0, totalMaxMinutes - elapsedMinutes);
    const citRatio = remainingMinutes / totalMaxMinutes;

    let viabilityStatus = 'optimal';
    if (citRatio <= 0) viabilityStatus = 'expired';
    else if (citRatio < 0.25) viabilityStatus = 'critical';
    else if (citRatio < 0.50) viabilityStatus = 'caution';

    transitLog.elapsedCitMinutes = elapsedMinutes;
    transitLog.remainingCitMinutes = remainingMinutes;
    transitLog.viabilityStatus = viabilityStatus;
    await transitLog.save();

    res.json({ success: true, transitLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Simulate / Advance a GPS transit step along the Green Corridor
 */
router.post('/simulate-step/:matchId', async (req, res) => {
  try {
    const transitLog = await TransitLog.findOne({ match: req.params.matchId })
      .populate('donorHospital')
      .populate('recipientHospital')
      .populate({
        path: 'match',
        populate: ['donorOrgan', 'recipientRequest']
      });

    if (!transitLog) return res.status(404).json({ success: false, message: 'Transit log not found.' });

    // Step forward progress by 15-20%
    const stepIncrement = Number(req.body.stepIncrement) || 16.6;
    let newProgress = Math.min(100, transitLog.progressPercent + stepIncrement);

    const waypoints = transitLog.waypoints || [];
    const waypointIndex = Math.min(waypoints.length - 1, Math.floor((newProgress / 100) * waypoints.length));
    
    // Mark passed waypoints
    waypoints.forEach((wp, idx) => {
      if (idx <= waypointIndex) wp.passed = true;
    });

    const targetCoord = waypoints[waypointIndex] || transitLog.destinationCoordinates;
    
    // Simulate slight natural cold-box temp fluctuation within safe 2.8°C - 4.5°C
    const tempFluctuation = Number((3.2 + Math.random() * 0.9).toFixed(2));
    
    // Dynamic CIT calculation
    const elapsedMinutes = Math.round((Date.now() - new Date(transitLog.harvestTimestamp).getTime()) / (1000 * 60));
    const totalMaxMinutes = transitLog.maxCitHours * 60;
    const remainingMinutes = Math.max(0, totalMaxMinutes - elapsedMinutes);
    const citRatio = remainingMinutes / totalMaxMinutes;
    
    let viabilityStatus = 'optimal';
    if (citRatio <= 0) viabilityStatus = 'expired';
    else if (citRatio < 0.25) viabilityStatus = 'critical';
    else if (citRatio < 0.50) viabilityStatus = 'caution';

    transitLog.progressPercent = Math.round(newProgress);
    transitLog.currentLocation = { latitude: targetCoord.latitude, longitude: targetCoord.longitude };
    transitLog.temperatureCelsius = tempFluctuation;
    transitLog.elapsedCitMinutes = elapsedMinutes;
    transitLog.remainingCitMinutes = remainingMinutes;
    transitLog.viabilityStatus = viabilityStatus;

    if (newProgress >= 100) {
      transitLog.status = 'arrived';
      transitLog.speedKmh = 0;
    } else {
      transitLog.status = 'in_corridor';
    }

    await transitLog.save();

    // Broadcast live telemetry via WebSocket
    broadcastTransitTelemetry(transitLog.match._id, {
      type: 'TELEMETRY_UPDATE',
      transitLog: transitLog.toObject()
    });

    res.json({
      success: true,
      message: newProgress >= 100 ? 'Organ arrived at recipient hospital! Ready for delivery verification.' : 'Transit step updated.',
      transitLog
    });
  } catch (err) {
    console.error('Simulate step error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * List all active in-transit organs
 */
router.get('/', async (req, res) => {
  try {
    const activeLogs = await TransitLog.find({ status: { $in: ['dispatched', 'in_corridor', 'approaching_destination', 'arrived'] } })
      .populate('donorHospital')
      .populate('recipientHospital')
      .populate({
        path: 'match',
        populate: ['donorOrgan', 'recipientRequest']
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: activeLogs.length, activeTransits: activeLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
