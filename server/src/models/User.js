const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['hospital_admin', 'transplant_surgeon', 'coordinator', 'patient_donor'],
    default: 'transplant_surgeon'
  },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  medicalLicenseId: { type: String },
  phone: { type: String },
  auth0Id: { type: String }, // For Auth0 compatibility / hybrid auth
  isIdentityVerified: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'suspended', 'pending_verification'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
