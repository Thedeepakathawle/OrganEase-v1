const mongoose = require('mongoose');

const donorOrganSchema = new mongoose.Schema({
  donorId: { type: String, required: true }, // e.g. DNR-2026-9041
  donorAge: { type: Number, required: true },
  donorGender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  organType: { 
    type: String, 
    enum: ['Heart', 'Kidney', 'Liver', 'Lung', 'Pancreas', 'Cornea'],
    required: true 
  },
  bloodType: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true 
  },
  hlaTyping: {
    hlaA: { type: String, default: 'A*02, A*24' },
    hlaB: { type: String, default: 'B*07, B*44' },
    hlaC: { type: String, default: 'C*07, C*12' },
    hlaDR: { type: String, default: 'DRB1*04, DRB1*15' },
    hlaDQ: { type: String, default: 'DQB1*03, DQB1*06' }
  },
  // AES-256-GCM encrypted biological profile and sensitive clinical history
  encryptedClinicalProfile: { type: String, required: true },
  
  harvestTime: { type: Date, required: true },
  maxColdIschemiaHours: { type: Number, required: true }, // e.g. Heart: 4, Liver: 12, Kidney: 30
  
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  status: { 
    type: String, 
    enum: ['available', 'matched', 'in_transit', 'transplanted', 'expired'], 
    default: 'available' 
  },
  matchedRecipient: { type: mongoose.Schema.Types.ObjectId, ref: 'RecipientRequest' },
  activeMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  deliveryKey: { type: String } // Key generated when matched/dispatched
}, { timestamps: true });

module.exports = mongoose.model('DonorOrgan', donorOrganSchema);
