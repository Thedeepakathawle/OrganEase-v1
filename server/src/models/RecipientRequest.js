const mongoose = require('mongoose');

const recipientRequestSchema = new mongoose.Schema({
  patientCode: { type: String, required: true }, // e.g. RCP-2026-1182
  patientName: { type: String, required: true },
  patientAge: { type: Number, required: true },
  patientGender: { type: String, enum: ['male', 'female', 'other'], default: 'female' },
  organNeeded: { 
    type: String, 
    enum: ['Heart', 'Kidney', 'Liver', 'Lung', 'Pancreas', 'Cornea'],
    required: true 
  },
  bloodType: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true 
  },
  urgencyLevel: { 
    type: String, 
    enum: ['Status 1A (Emergency)', 'Status 1B (Urgent)', 'Status 2 (Standard)'],
    default: 'Status 1B (Urgent)' 
  },
  medicalSeverityScore: { 
    type: Number, 
    default: 25 // e.g. MELD score (6-40), CPRA percentage, or Cardiac emergency index
  },
  isPediatric: { type: Boolean, default: false },
  waitingListEntryDate: { type: Date, default: Date.now },
  
  hlaTyping: {
    hlaA: { type: String, default: 'A*02, A*24' },
    hlaB: { type: String, default: 'B*07, B*44' },
    hlaC: { type: String, default: 'C*07, C*12' },
    hlaDR: { type: String, default: 'DRB1*04, DRB1*15' },
    hlaDQ: { type: String, default: 'DQB1*03, DQB1*06' }
  },
  
  // AES-256-GCM encrypted medical details
  encryptedClinicalProfile: { type: String, required: true },
  
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  attendingPhysician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  status: { 
    type: String, 
    enum: ['waiting', 'matched', 'transplanted', 'cancelled'], 
    default: 'waiting' 
  },
  activeMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' }
}, { timestamps: true });

module.exports = mongoose.model('RecipientRequest', recipientRequestSchema);
