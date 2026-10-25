const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  donorOrgan: { type: mongoose.Schema.Types.ObjectId, ref: 'DonorOrgan', required: true },
  recipientRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'RecipientRequest', required: true },
  donorHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  recipientHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  
  matchScore: { type: Number, required: true }, // Overall 0-100
  isRecommended: { type: Boolean, default: true },
  
  scoreBreakdown: {
    bloodGroupScore: { type: Number, required: true },
    urgencyScore: { type: Number, required: true },
    hlaTissueScore: { type: Number, required: true },
    citFeasibilityScore: { type: Number, required: true },
    waitingListScore: { type: Number, required: true },
    notes: [{ type: String }]
  },
  
  distanceKm: { type: Number, required: true },
  estimatedTransitMinutes: { type: Number, required: true },
  safeCitMarginHours: { type: Number, required: true },
  citFeasible: { type: Boolean, default: true },
  
  status: { 
    type: String, 
    enum: ['pending', 'alerted', 'accepted', 'in_transit', 'delivered', 'rejected'], 
    default: 'pending' 
  },
  
  deliveryKey: { type: String, required: true }, // Cryptographic handshake key
  acceptedAt: { type: Date },
  dispatchedAt: { type: Date },
  deliveredAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
