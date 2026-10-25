const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registrationId: { type: String, required: true, unique: true },
  licenseNumber: { type: String, required: true },
  type: { type: String, enum: ['Organ Procurement Organization', 'Transplant Center', 'Trauma Care Hospital'], default: 'Transplant Center' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  contactEmail: { type: String, required: true },
  emergencyHotline: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  transplantCapabilities: [{ type: String }] // e.g. ['Heart', 'Kidney', 'Liver', 'Lung', 'Pancreas']
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
