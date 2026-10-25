const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Hospital = require('./models/Hospital');
const User = require('./models/User');
const DonorOrgan = require('./models/DonorOrgan');
const RecipientRequest = require('./models/RecipientRequest');
const Match = require('./models/Match');
const TransitLog = require('./models/TransitLog');
const AuditRecord = require('./models/AuditRecord');
const { encrypt, hashPayload, generateDeliveryKey } = require('./utils/crypto');
const { computeMatchScore } = require('./services/matchingEngine');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/organ_ease';

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected. Clearing previous test collections...');

    await Promise.all([
      Hospital.deleteMany({}),
      User.deleteMany({}),
      DonorOrgan.deleteMany({}),
      RecipientRequest.deleteMany({}),
      Match.deleteMany({}),
      TransitLog.deleteMany({}),
      AuditRecord.deleteMany({})
    ]);

    console.log('[Seed] Seeding Hospitals...');
    const hospitals = await Hospital.insertMany([
      {
        name: 'Metro General Trauma & Organ Procurement Center',
        registrationId: 'HOSP-NY-001',
        licenseNumber: 'TX-NY-98214',
        type: 'Organ Procurement Organization',
        city: 'New York',
        state: 'NY',
        address: '550 1st Avenue, Manhattan, NY 10016',
        coordinates: { latitude: 40.7423, longitude: -73.9748 },
        contactEmail: 'procurement@metrohealth.org',
        emergencyHotline: '+1-212-555-0144',
        isVerified: true,
        transplantCapabilities: ['Heart', 'Kidney', 'Liver', 'Lung', 'Pancreas']
      },
      {
        name: 'St. Jude Comprehensive Transplant Institute',
        registrationId: 'HOSP-PA-002',
        licenseNumber: 'TX-PA-77319',
        type: 'Transplant Center',
        city: 'Philadelphia',
        state: 'PA',
        address: '3400 Spruce Street, Philadelphia, PA 19104',
        coordinates: { latitude: 39.9502, longitude: -75.1932 },
        contactEmail: 'transplant-coord@stjudetx.org',
        emergencyHotline: '+1-215-555-0188',
        isVerified: true,
        transplantCapabilities: ['Heart', 'Kidney', 'Liver', 'Pancreas']
      },
      {
        name: 'Johns Hopkins Advanced Surgical Hospital',
        registrationId: 'HOSP-MD-003',
        licenseNumber: 'TX-MD-65120',
        type: 'Transplant Center',
        city: 'Baltimore',
        state: 'MD',
        address: '1800 Orleans Street, Baltimore, MD 21287',
        coordinates: { latitude: 39.2974, longitude: -76.5924 },
        contactEmail: 'dispatch@hopkinssurgery.org',
        emergencyHotline: '+1-410-555-0199',
        isVerified: true,
        transplantCapabilities: ['Heart', 'Kidney', 'Liver', 'Lung', 'Cornea']
      }
    ]);

    const [hospNY, hospPA, hospMD] = hospitals;

    console.log('[Seed] Seeding Users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('OrganEase2026!', salt);

    const users = await User.insertMany([
      {
        name: 'Dr. Sarah Lin, MD (Transplant Surgeon)',
        email: 'sarah.lin@stjudetx.org',
        passwordHash,
        role: 'transplant_surgeon',
        hospital: hospPA._id,
        medicalLicenseId: 'MD-SURG-98421',
        phone: '+1-215-555-0122',
        isIdentityVerified: true
      },
      {
        name: 'Marcus Brody (Procurement Coordinator)',
        email: 'marcus.brody@metrohealth.org',
        passwordHash,
        role: 'coordinator',
        hospital: hospNY._id,
        medicalLicenseId: 'COORD-OP-4102',
        phone: '+1-212-555-0133',
        isIdentityVerified: true
      },
      {
        name: 'Elena Rostova (Transit & Dispatch Officer)',
        email: 'dispatch@organ-ease.io',
        passwordHash,
        role: 'hospital_admin',
        hospital: hospNY._id,
        medicalLicenseId: 'DISPATCH-CMD-11',
        phone: '+1-800-555-0190',
        isIdentityVerified: true
      }
    ]);

    console.log('[Seed] Seeding Recipient Waiting List...');
    // Create urgent Heart recipient in Philadelphia
    const recipientHeart = new RecipientRequest({
      patientCode: 'RCP-2026-HRT-01',
      patientName: 'David K. Miller',
      patientAge: 42,
      patientGender: 'male',
      organNeeded: 'Heart',
      bloodType: 'O+',
      urgencyLevel: 'Status 1A (Emergency)',
      medicalSeverityScore: 38, // Critical ECMO dependent
      isPediatric: false,
      waitingListEntryDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days waiting
      hlaTyping: {
        hlaA: 'A*02, A*24',
        hlaB: 'B*07, B*44',
        hlaC: 'C*07, C*12',
        hlaDR: 'DRB1*04, DRB1*15',
        hlaDQ: 'DQB1*03, DQB1*06'
      },
      encryptedClinicalProfile: encrypt({
        clinicalDiagnosis: 'Biventricular end-stage cardiomyopathy on VA-ECMO bridge to transplant.',
        bloodPressure: '88/54 mmHg',
        ejectionFraction: '14%',
        icuLocation: 'Cardiac ICU Bed 4B, St. Jude Transplant Institute'
      }),
      hospital: hospPA._id,
      attendingPhysician: users[0]._id,
      status: 'waiting'
    });
    await recipientHeart.save();

    // Create Kidney recipient in Baltimore
    const recipientKidney = new RecipientRequest({
      patientCode: 'RCP-2026-KID-02',
      patientName: 'Maria Rodriguez',
      patientAge: 36,
      patientGender: 'female',
      organNeeded: 'Kidney',
      bloodType: 'A+',
      urgencyLevel: 'Status 1B (Urgent)',
      medicalSeverityScore: 29,
      isPediatric: false,
      waitingListEntryDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      hlaTyping: {
        hlaA: 'A*01, A*03',
        hlaB: 'B*08, B*35',
        hlaC: 'C*04, C*07',
        hlaDR: 'DRB1*03, DRB1*11',
        hlaDQ: 'DQB1*02, DQB1*03'
      },
      encryptedClinicalProfile: encrypt({
        clinicalDiagnosis: 'End-stage renal disease secondary to focal segmental glomerulosclerosis on hemodialysis 3x/week.',
        cpraPercentage: '45%'
      }),
      hospital: hospMD._id,
      attendingPhysician: users[0]._id,
      status: 'waiting'
    });
    await recipientKidney.save();

    console.log('[Seed] Seeding Available Donor Organs...');
    // Create freshly harvested Heart in New York
    const donorHeart = new DonorOrgan({
      donorId: 'DNR-2026-NY-4401',
      donorAge: 29,
      donorGender: 'male',
      organType: 'Heart',
      bloodType: 'O+', // Matches O+ recipient!
      hlaTyping: {
        hlaA: 'A*02, A*24',
        hlaB: 'B*07, B*44',
        hlaC: 'C*07, C*12',
        hlaDR: 'DRB1*04, DRB1*15',
        hlaDQ: 'DQB1*03, DQB1*06'
      },
      encryptedClinicalProfile: encrypt({
        donorClinicalDetails: 'Donor age 29, motorcycle trauma, declared brain dead with family consent.',
        coronaryAngiogram: 'Clean coronary arteries, LV ejection fraction 62%, normal wall motion.',
        crossmatch: 'Negative CDC T and B cell crossmatch.'
      }),
      harvestTime: new Date(Date.now() - 35 * 60 * 1000), // Harvested 35 mins ago!
      maxColdIschemiaHours: 4, // Max safe CIT for heart
      hospital: hospNY._id,
      registeredBy: users[1]._id,
      status: 'available'
    });
    await donorHeart.save();

    // Create Donor Kidney in Baltimore
    const donorKidney = new DonorOrgan({
      donorId: 'DNR-2026-MD-8812',
      donorAge: 34,
      donorGender: 'female',
      organType: 'Kidney',
      bloodType: 'A+',
      hlaTyping: {
        hlaA: 'A*01, A*02',
        hlaB: 'B*08, B*44',
        hlaC: 'C*04, C*07',
        hlaDR: 'DRB1*03, DRB1*04',
        hlaDQ: 'DQB1*02, DQB1*03'
      },
      encryptedClinicalProfile: encrypt({
        donorClinicalDetails: 'Non-marginal donor, normal creatinine clearance 118 mL/min, zero proteinuria.',
        anatomy: 'Single renal artery and vein, intact ureter.'
      }),
      harvestTime: new Date(Date.now() - 120 * 60 * 1000),
      maxColdIschemiaHours: 24,
      hospital: hospMD._id,
      registeredBy: users[1]._id,
      status: 'available'
    });
    await donorKidney.save();

    console.log('[Seed] Computing Initial Match & Transit Scenario...');
    const matchEvaluation = computeMatchScore(donorHeart, recipientHeart, hospNY, hospPA);
    const deliveryKey = generateDeliveryKey();

    const initialMatch = new Match({
      donorOrgan: donorHeart._id,
      recipientRequest: recipientHeart._id,
      donorHospital: hospNY._id,
      recipientHospital: hospPA._id,
      matchScore: matchEvaluation.matchScore,
      isRecommended: matchEvaluation.isRecommended,
      scoreBreakdown: matchEvaluation.scoreBreakdown,
      distanceKm: matchEvaluation.distanceKm,
      estimatedTransitMinutes: matchEvaluation.estimatedTransitMinutes,
      safeCitMarginHours: matchEvaluation.safeCitMarginHours,
      citFeasible: matchEvaluation.citFeasible,
      status: 'accepted',
      deliveryKey,
      acceptedAt: new Date(Date.now() - 15 * 60 * 1000),
      dispatchedAt: new Date(Date.now() - 10 * 60 * 1000)
    });
    await initialMatch.save();

    donorHeart.status = 'in_transit';
    donorHeart.activeMatchId = initialMatch._id;
    donorHeart.deliveryKey = deliveryKey;
    await donorHeart.save();

    recipientHeart.status = 'matched';
    recipientHeart.activeMatchId = initialMatch._id;
    await recipientHeart.save();

    // Create Initial Transit Log with realistic intermediate waypoints along I-95 green corridor
    const origin = hospNY.coordinates;
    const dest = hospPA.coordinates;
    const waypoints = [
      { latitude: 40.7423, longitude: -73.9748, passed: true },  // Manhattan NY
      { latitude: 40.6892, longitude: -74.1745, passed: true },  // Newark NJ Corridor
      { latitude: 40.4862, longitude: -74.4518, passed: true },  // New Brunswick NJ
      { latitude: 40.2206, longitude: -74.7597, passed: false }, // Trenton NJ
      { latitude: 40.0988, longitude: -74.9654, passed: false }, // Northeast Philly Corridor
      { latitude: 39.9502, longitude: -75.1932, passed: false }  // St. Jude Philly Destination
    ];

    const transitLog = new TransitLog({
      match: initialMatch._id,
      donorHospital: hospNY._id,
      recipientHospital: hospPA._id,
      vehicleType: 'Emergency Ambulance (Green Corridor)',
      vehicleCallsign: 'MED-CORRIDOR-HEART-01',
      dispatchOfficer: 'State Trooper Sgt. T. Rourke (NJ/PA Highway Patrol Clearance)',
      currentLocation: { latitude: 40.4862, longitude: -74.4518 }, // Currently near New Brunswick NJ
      originCoordinates: origin,
      destinationCoordinates: dest,
      waypoints,
      progressPercent: 48,
      speedKmh: 104,
      temperatureCelsius: 3.6,
      batteryPercentage: 92,
      harvestTimestamp: donorHeart.harvestTime,
      maxCitHours: 4,
      elapsedCitMinutes: 45,
      remainingCitMinutes: 195,
      viabilityStatus: 'optimal',
      greenCorridorActive: true,
      trafficClearanceStatus: 'Green Corridor Cleared by Regional Police Escort',
      status: 'in_corridor'
    });
    await transitLog.save();

    console.log('[Seed] Creating Genesis Audit Records...');
    const genesisAuditPayload = {
      action: 'PLATFORM_GENESIS',
      system: 'OrganEase MERN Platform',
      hospitalsSeeded: hospitals.length,
      protocolVersion: '1.0.0-HIPAA-Compliant'
    };
    const genesisHash = hashPayload(genesisAuditPayload, '0000000000000000000000000000000000000000000000000000000000000000');

    const audit1 = new AuditRecord({
      auditIndex: 1,
      actionType: 'ORGAN_REGISTERED',
      donorOrganId: donorHeart._id,
      hospitalId: hospNY._id,
      performedBy: 'Marcus Brody (Procurement Coordinator)',
      encryptedDataPayload: encrypt({ donorId: donorHeart.donorId, organType: 'Heart', bloodType: 'O+' }),
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      recordHash: genesisHash,
      complianceCertificateId: 'CERT-GENESIS-2026-001'
    });
    await audit1.save();

    const matchAuditPayload = {
      action: 'MATCH_COMPUTED',
      matchId: initialMatch._id,
      matchScore: initialMatch.matchScore,
      donor: donorHeart.donorId,
      recipient: recipientHeart.patientCode
    };
    const audit2Hash = hashPayload(matchAuditPayload, genesisHash);

    const audit2 = new AuditRecord({
      auditIndex: 2,
      actionType: 'EMERGENCY_ALERT_TRIGGERED',
      matchId: initialMatch._id,
      donorOrganId: donorHeart._id,
      recipientRequestId: recipientHeart._id,
      hospitalId: hospPA._id,
      performedBy: 'Core Organ Matching Engine (WebSocket Alert Service)',
      encryptedDataPayload: encrypt(matchAuditPayload),
      previousHash: genesisHash,
      recordHash: audit2Hash,
      complianceCertificateId: 'CERT-ALT-2026-002'
    });
    await audit2.save();

    console.log('[Seed] Database successfully seeded with test scenario!');
    console.log(`[Seed] Initial Match ID: ${initialMatch._id}`);
    console.log(`[Seed] Delivery Handshake Key: ${deliveryKey}`);
    console.log(`[Seed] Demo Login Accounts:
      - Surgeon: sarah.lin@stjudetx.org (password: OrganEase2026!)
      - Coordinator: marcus.brody@metrohealth.org (password: OrganEase2026!)
      - Dispatch Officer: dispatch@organ-ease.io (password: OrganEase2026!)
    `);

    await mongoose.disconnect();
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
