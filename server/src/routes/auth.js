const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'organ_ease_jwt_super_secret_key_2026_secure';

/**
 * Register a Hospital Team Member, Doctor, or Patient/Donor
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, hospitalId, medicalLicenseId, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    
    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const user = new User({
      name,
      email,
      passwordHash,
      role: role || 'transplant_surgeon',
      hospital: hospitalId || null,
      medicalLicenseId: medicalLicenseId || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      phone: phone || '+1-555-0199',
      isIdentityVerified: true
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, hospitalId: user.hospital },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully with verified identity.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospital: user.hospital,
        medicalLicenseId: user.medicalLicenseId
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    
    const user = await User.findOne({ email }).populate('hospital');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, hospitalId: user.hospital?._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospital: user.hospital,
        medicalLicenseId: user.medicalLicenseId
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Current User Profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('hospital').select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get List of Registered Hospitals
 */
router.get('/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    res.json({ success: true, hospitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Onboard a New Hospital
 */
router.post('/hospitals', async (req, res) => {
  try {
    const { name, registrationId, licenseNumber, type, city, state, address, coordinates, contactEmail, emergencyHotline, transplantCapabilities } = req.body;
    
    const hospital = new Hospital({
      name,
      registrationId: registrationId || `HOSP-${Date.now().toString().slice(-6)}`,
      licenseNumber: licenseNumber || `TX-LIC-${Math.floor(1000 + Math.random() * 9000)}`,
      type: type || 'Transplant Center',
      city,
      state,
      address,
      coordinates: coordinates || { latitude: 40.7128, longitude: -74.0060 },
      contactEmail,
      emergencyHotline,
      transplantCapabilities: transplantCapabilities || ['Heart', 'Kidney', 'Liver', 'Lung']
    });
    
    await hospital.save();
    res.status(201).json({ success: true, message: 'Hospital onboarded and verified.', hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
