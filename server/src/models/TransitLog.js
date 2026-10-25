const mongoose = require('mongoose');

const transitLogSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  donorHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  recipientHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  
  vehicleType: { type: String, enum: ['Emergency Ambulance (Green Corridor)', 'Medical Dispatch Helicopter', 'High-Speed Medevac'], default: 'Emergency Ambulance (Green Corridor)' },
  vehicleCallsign: { type: String, default: 'MED-CORRIDOR-ALPHA-1' },
  dispatchOfficer: { type: String, default: 'Officer J. Vance (Traffic Command Priority)' },
  
  currentLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  
  originCoordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  
  destinationCoordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  
  waypoints: [{
    latitude: Number,
    longitude: Number,
    passed: { type: Boolean, default: false }
  }],
  
  progressPercent: { type: Number, default: 0 },
  speedKmh: { type: Number, default: 85 },
  
  // Real-time medical cold-box telemetry
  temperatureCelsius: { type: Number, default: 3.8 }, // Normal safe: 2.0 - 8.0 C
  temperatureAlert: { type: Boolean, default: false },
  batteryPercentage: { type: Number, default: 94 },
  
  // Cold Ischemia Time monitoring
  harvestTimestamp: { type: Date, required: true },
  maxCitHours: { type: Number, required: true },
  elapsedCitMinutes: { type: Number, default: 0 },
  remainingCitMinutes: { type: Number, required: true },
  viabilityStatus: { 
    type: String, 
    enum: ['optimal', 'caution', 'critical', 'expired'], 
    default: 'optimal' 
  },
  
  greenCorridorActive: { type: Boolean, default: true },
  trafficClearanceStatus: { type: String, default: 'Green Corridor Cleared by Regional Police' },
  
  status: { 
    type: String, 
    enum: ['dispatched', 'in_corridor', 'approaching_destination', 'arrived', 'delivered'], 
    default: 'dispatched' 
  }
}, { timestamps: true });

module.exports = mongoose.model('TransitLog', transitLogSchema);
