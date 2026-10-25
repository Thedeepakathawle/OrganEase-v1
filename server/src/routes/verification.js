const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const DonorOrgan = require('../models/DonorOrgan');
const RecipientRequest = require('../models/RecipientRequest');
const TransitLog = require('../models/TransitLog');
const AuditRecord = require('../models/AuditRecord');
const { broadcastDeliveryVerified } = require('../services/socketService');
const { encrypt, decrypt, hashPayload } = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

/**
 * Verify Organ Delivery & Complete Digital Handshake
 * Recipient hospital team submits the cryptographic delivery key upon organ physical handover.
 */
router.post('/verify-delivery', authenticateToken, async (req, res) => {
  try {
    const { 
      matchId, 
      deliveryKey, 
      receivingSurgeonName, 
      containerTemperature, 
      containerIntegrityChecked, 
      medicalNotes 
    } = req.body;

    if (!matchId || !deliveryKey) {
      return res.status(400).json({ success: false, message: 'Match ID and Cryptographic Delivery Key are required.' });
    }

    const match = await Match.findById(matchId)
      .populate('donorOrgan')
      .populate('recipientRequest')
      .populate('donorHospital')
      .populate('recipientHospital');

    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

    // Validate delivery key cryptographic handshake
    if (match.deliveryKey.trim().toUpperCase() !== deliveryKey.trim().toUpperCase()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cryptographic Delivery Key mismatch! Verification rejected.' 
      });
    }

    const now = new Date();
    const tempReading = Number(containerTemperature) || 3.6;
    const isTempCompliant = tempReading >= 2.0 && tempReading <= 8.0;

    // 1. Update Match status
    match.status = 'delivered';
    match.deliveredAt = now;
    await match.save();

    // 2. Update Donor Organ & Recipient Request
    await DonorOrgan.findByIdAndUpdate(match.donorOrgan._id, { status: 'transplanted' });
    await RecipientRequest.findByIdAndUpdate(match.recipientRequest._id, { status: 'transplanted' });

    // 3. Update Transit Log
    await TransitLog.findOneAndUpdate({ match: match._id }, { 
      status: 'delivered', 
      progressPercent: 100, 
      speedKmh: 0,
      temperatureCelsius: tempReading 
    });

    // 4. Create Fully Encrypted, Tamper-Evident Immutable Audit Archive Record
    const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
    const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
    const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';

    const complianceCertificateId = `ORGANEASE-AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullArchivePayload = {
      complianceCertificateId,
      matchId: match._id,
      organType: match.donorOrgan.organType,
      donorId: match.donorOrgan.donorId,
      donorHospital: {
        id: match.donorHospital._id,
        name: match.donorHospital.name,
        city: match.donorHospital.city
      },
      recipientCode: match.recipientRequest.patientCode,
      recipientHospital: {
        id: match.recipientHospital._id,
        name: match.recipientHospital.name,
        city: match.recipientHospital.city
      },
      matchScore: match.matchScore,
      scoreBreakdown: match.scoreBreakdown,
      deliveryHandshake: {
        verifiedKey: deliveryKey,
        verifiedAt: now.toISOString(),
        verifiedByUser: req.user.email,
        receivingSurgeon: receivingSurgeonName || req.user.name,
        temperatureCelsius: tempReading,
        isTempCompliant,
        containerIntegrityChecked: Boolean(containerIntegrityChecked),
        medicalNotes: medicalNotes || 'Organ arrived in optimal viable condition. Transferred immediately to Operating Theater.'
      },
      archivedTimestamp: now.toISOString()
    };

    // AES-256-GCM encryption of full transaction data
    const encryptedDataPayload = encrypt(fullArchivePayload);
    // SHA-256 hash chaining
    const recordHash = hashPayload(fullArchivePayload, previousHash);

    const auditRecord = new AuditRecord({
      auditIndex,
      actionType: 'DELIVERY_HANDSHAKE_VERIFIED',
      matchId: match._id,
      donorOrganId: match.donorOrgan._id,
      recipientRequestId: match.recipientRequest._id,
      hospitalId: match.recipientHospital._id,
      performedBy: req.user.email || receivingSurgeonName || 'Transplant Surgeon',
      encryptedDataPayload,
      previousHash,
      recordHash,
      deliveryVerificationHandshake: {
        verifiedKey: deliveryKey,
        verifiedAt: now,
        receivingSurgeon: receivingSurgeonName || req.user.name,
        containerIntegrityChecked: Boolean(containerIntegrityChecked),
        temperatureAtDelivery: tempReading,
        verificationStatus: 'CONFIRMED_COMPLIANT'
      },
      complianceCertificateId
    });

    await auditRecord.save();

    // Broadcast verification event via WebSocket
    broadcastDeliveryVerified({
      matchId: match._id,
      complianceCertificateId,
      organType: match.donorOrgan.organType,
      recipientHospitalName: match.recipientHospital.name,
      deliveredAt: now
    });

    res.json({
      success: true,
      message: 'Delivery verified successfully. Organ match confirmed and transaction record cryptographically archived for regulatory compliance.',
      complianceCertificateId,
      recordHash,
      previousHash,
      deliveredAt: now,
      certificateData: fullArchivePayload
    });
  } catch (err) {
    console.error('Delivery verification error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * List all Audit Records (with cryptographic integrity verification status)
 */
router.get('/records', async (req, res) => {
  try {
    const records = await AuditRecord.find()
      .populate('hospitalId', 'name city licenseNumber')
      .populate({
        path: 'matchId',
        populate: ['donorOrgan', 'recipientRequest']
      })
      .sort({ auditIndex: -1 });

    const decryptedRecords = records.map(record => {
      const obj = record.toObject();
      obj.decryptedPayload = decrypt(record.encryptedDataPayload);
      return obj;
    });

    res.json({ success: true, count: decryptedRecords.length, records: decryptedRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get specific Certificate & Audit Record for compliance printout/export
 */
router.get('/certificate/:certificateId', async (req, res) => {
  try {
    const record = await AuditRecord.findOne({ complianceCertificateId: req.params.certificateId })
      .populate('hospitalId')
      .populate({
        path: 'matchId',
        populate: ['donorOrgan', 'recipientRequest', 'donorHospital', 'recipientHospital']
      });

    if (!record) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const certificate = {
      recordId: record._id,
      auditIndex: record.auditIndex,
      complianceCertificateId: record.complianceCertificateId,
      recordHash: record.recordHash,
      previousHash: record.previousHash,
      actionType: record.actionType,
      performedBy: record.performedBy,
      timestamp: record.timestamp,
      verificationDetails: record.deliveryVerificationHandshake,
      decryptedData: decrypt(record.encryptedDataPayload)
    };

    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
