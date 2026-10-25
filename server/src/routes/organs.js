const express = require('express');
const router = express.Router();
const DonorOrgan = require('../models/DonorOrgan');
const RecipientRequest = require('../models/RecipientRequest');
const Hospital = require('../models/Hospital');
const AuditRecord = require('../models/AuditRecord');
const { encrypt, decrypt, hashPayload } = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');
const { runMatchingForDonorOrgan, runMatchingForRecipient } = require('./matching');

/**
 * Submit Organ Donation Availability (Donor Organ)
 * Sensitive biological & clinical data is encrypted via AES-256-GCM
 */
router.post('/donors', authenticateToken, async (req, res) => {
  try {
    const {
      donorAge,
      donorGender,
      organType,
      bloodType,
      hlaTyping,
      clinicalNotes,
      causeOfDeath,
      viabilityParameters,
      harvestTime,
      maxColdIschemiaHours,
      hospitalId
    } = req.body;

    const assignedHospitalId = hospitalId || req.user.hospitalId;
    if (!assignedHospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital identification is required.' });
    }

    // Encrypt sensitive biological & clinical profile with AES-256-GCM
    const sensitivePayload = {
      clinicalNotes: clinicalNotes || 'Donor hemodynamically stable prior to organ recovery. Normal cardiac and renal biomarkers.',
      causeOfDeath: causeOfDeath || 'Traumatic brain injury (declared brain dead)',
      viabilityParameters: viabilityParameters || { biopsyScore: 'Normal', ejectionFraction: '60%', crCl: '105 mL/min' },
      registeredByUserId: req.user.userId,
      registeredAt: new Date().toISOString()
    };
    const encryptedClinicalProfile = encrypt(sensitivePayload);

    // Determine safe CIT if not specified
    const defaultCIT = {
      'Heart': 4,
      'Lung': 6,
      'Liver': 10,
      'Pancreas': 12,
      'Kidney': 24,
      'Cornea': 48
    }[organType] || 8;

    const donorOrgan = new DonorOrgan({
      donorId: `DNR-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      donorAge: Number(donorAge) || 32,
      donorGender: donorGender || 'male',
      organType,
      bloodType,
      hlaTyping: hlaTyping || {
        hlaA: 'A*02, A*24',
        hlaB: 'B*07, B*44',
        hlaC: 'C*07, C*12',
        hlaDR: 'DRB1*04, DRB1*15',
        hlaDQ: 'DQB1*03, DQB1*06'
      },
      encryptedClinicalProfile,
      harvestTime: harvestTime ? new Date(harvestTime) : new Date(),
      maxColdIschemiaHours: Number(maxColdIschemiaHours) || defaultCIT,
      hospital: assignedHospitalId,
      registeredBy: req.user.userId,
      status: 'available'
    });

    await donorOrgan.save();

    // Create cryptographic audit record for organ registration
    const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
    const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
    const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';
    
    const auditPayload = {
      action: 'ORGAN_REGISTERED',
      donorOrganId: donorOrgan._id,
      organType: donorOrgan.organType,
      bloodType: donorOrgan.bloodType,
      hospitalId: assignedHospitalId
    };
    const recordHash = hashPayload(auditPayload, previousHash);

    const auditRecord = new AuditRecord({
      auditIndex,
      actionType: 'ORGAN_REGISTERED',
      donorOrganId: donorOrgan._id,
      hospitalId: assignedHospitalId,
      performedBy: req.user.email || 'Medical Coordinator',
      encryptedDataPayload: encrypt(auditPayload),
      previousHash,
      recordHash,
      complianceCertificateId: `CERT-REG-${Date.now().toString(36).toUpperCase()}`
    });
    await auditRecord.save();

    // Trigger Core Organ Matching Engine immediately!
    const matches = await runMatchingForDonorOrgan(donorOrgan._id);

    res.status(201).json({
      success: true,
      message: 'Donor organ registered and encrypted successfully. Matching engine triggered.',
      donorOrgan: {
        ...donorOrgan.toObject(),
        clinicalProfile: sensitivePayload // Return decrypted for immediate user confirmation
      },
      computedMatchesCount: matches.length,
      topMatch: matches[0] || null
    });
  } catch (err) {
    console.error('Donor organ creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Submit Recipient Need / Waiting List Request
 * Biological & clinical urgency parameters encrypted via AES-256-GCM
 */
router.post('/recipients', authenticateToken, async (req, res) => {
  try {
    const {
      patientName,
      patientAge,
      patientGender,
      organNeeded,
      bloodType,
      urgencyLevel,
      medicalSeverityScore,
      isPediatric,
      hlaTyping,
      clinicalDiagnosis,
      hospitalId
    } = req.body;

    const assignedHospitalId = hospitalId || req.user.hospitalId;
    if (!assignedHospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital identification is required.' });
    }

    const sensitivePayload = {
      clinicalDiagnosis: clinicalDiagnosis || 'End-stage organ failure requiring urgent transplant intervention.',
      attendingNotes: 'Patient currently hospitalized in ICU, evaluated for multi-organ compatibility.',
      registeredAt: new Date().toISOString()
    };
    const encryptedClinicalProfile = encrypt(sensitivePayload);

    const recipient = new RecipientRequest({
      patientCode: `RCP-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      patientName: patientName || 'Confidential Patient',
      patientAge: Number(patientAge) || 45,
      patientGender: patientGender || 'female',
      organNeeded,
      bloodType,
      urgencyLevel: urgencyLevel || 'Status 1B (Urgent)',
      medicalSeverityScore: Number(medicalSeverityScore) || 28,
      isPediatric: Boolean(isPediatric || patientAge < 18),
      hlaTyping: hlaTyping || {
        hlaA: 'A*02, A*03',
        hlaB: 'B*07, B*08',
        hlaC: 'C*07, C*12',
        hlaDR: 'DRB1*04, DRB1*07',
        hlaDQ: 'DQB1*03, DQB1*05'
      },
      encryptedClinicalProfile,
      hospital: assignedHospitalId,
      attendingPhysician: req.user.userId,
      status: 'waiting'
    });

    await recipient.save();

    // Create cryptographic audit record
    const previousAudit = await AuditRecord.findOne().sort({ auditIndex: -1 });
    const auditIndex = previousAudit ? previousAudit.auditIndex + 1 : 1;
    const previousHash = previousAudit ? previousAudit.recordHash : 'GENESIS_ROOT_HASH_ORGANEASE';
    
    const auditPayload = {
      action: 'RECIPIENT_LOGGED',
      recipientId: recipient._id,
      patientCode: recipient.patientCode,
      organNeeded: recipient.organNeeded,
      bloodType: recipient.bloodType,
      urgencyLevel: recipient.urgencyLevel
    };
    const recordHash = hashPayload(auditPayload, previousHash);

    const auditRecord = new AuditRecord({
      auditIndex,
      actionType: 'RECIPIENT_LOGGED',
      recipientRequestId: recipient._id,
      hospitalId: assignedHospitalId,
      performedBy: req.user.email || 'Medical Coordinator',
      encryptedDataPayload: encrypt(auditPayload),
      previousHash,
      recordHash,
      complianceCertificateId: `CERT-RCP-${Date.now().toString(36).toUpperCase()}`
    });
    await auditRecord.save();

    // Trigger matching engine for this recipient
    const matches = await runMatchingForRecipient(recipient._id);

    res.status(201).json({
      success: true,
      message: 'Recipient request registered and encrypted. Matching engine evaluated available organs.',
      recipient: {
        ...recipient.toObject(),
        clinicalProfile: sensitivePayload
      },
      availableMatchesCount: matches.length,
      topMatch: matches[0] || null
    });
  } catch (err) {
    console.error('Recipient request creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all Donor Organs (with decrypted clinical profiles for authorized medical staff)
 */
router.get('/donors', async (req, res) => {
  try {
    const { status, organType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (organType) filter.organType = organType;

    const organs = await DonorOrgan.find(filter)
      .populate('hospital')
      .populate('registeredBy', 'name email role')
      .sort({ createdAt: -1 });

    const decryptedOrgans = organs.map(org => {
      const obj = org.toObject();
      obj.decryptedClinicalProfile = decrypt(org.encryptedClinicalProfile);
      return obj;
    });

    res.json({ success: true, count: decryptedOrgans.length, organs: decryptedOrgans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all Recipient Requests
 */
router.get('/recipients', async (req, res) => {
  try {
    const { status, organNeeded, urgencyLevel } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (organNeeded) filter.organNeeded = organNeeded;
    if (urgencyLevel) filter.urgencyLevel = urgencyLevel;

    const recipients = await RecipientRequest.find(filter)
      .populate('hospital')
      .populate('attendingPhysician', 'name email role')
      .sort({ createdAt: -1 });

    const decryptedRecipients = recipients.map(rcp => {
      const obj = rcp.toObject();
      obj.decryptedClinicalProfile = decrypt(rcp.encryptedClinicalProfile);
      return obj;
    });

    res.json({ success: true, count: decryptedRecipients.length, recipients: decryptedRecipients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
