const mongoose = require('mongoose');

const auditRecordSchema = new mongoose.Schema({
  auditIndex: { type: Number, required: true },
  actionType: { 
    type: String, 
    enum: [
      'ORGAN_REGISTERED', 
      'RECIPIENT_LOGGED', 
      'MATCH_COMPUTED', 
      'EMERGENCY_ALERT_TRIGGERED', 
      'MATCH_ACCEPTED', 
      'GREEN_CORRIDOR_DISPATCHED', 
      'TRANSIT_TELEMETRY_CHECKPOINT', 
      'DELIVERY_HANDSHAKE_VERIFIED', 
      'RECORD_ARCHIVED'
    ],
    required: true 
  },
  
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  donorOrganId: { type: mongoose.Schema.Types.ObjectId, ref: 'DonorOrgan' },
  recipientRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecipientRequest' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  performedBy: { type: String, required: true },
  
  // AES-256-GCM encrypted payload containing full clinical / legal details
  encryptedDataPayload: { type: String, required: true },
  
  // Cryptographic audit chain for immutability
  previousHash: { type: String, required: true },
  recordHash: { type: String, required: true },
  
  deliveryVerificationHandshake: {
    verifiedKey: String,
    verifiedAt: Date,
    receivingSurgeon: String,
    containerIntegrityChecked: Boolean,
    temperatureAtDelivery: Number,
    verificationStatus: String
  },
  
  complianceCertificateId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AuditRecord', auditRecordSchema);
