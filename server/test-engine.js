const assert = require('assert');
const { encrypt, decrypt, hashPayload, generateDeliveryKey } = require('./src/utils/crypto');
const { 
  computeMatchScore, 
  evaluateBloodCompatibility, 
  evaluateHLAMatch, 
  evaluateTransitCIT 
} = require('./src/services/matchingEngine');

console.log('=====================================================');
console.log('🧪 RUNNING ORGANEASE AUTOMATED TEST SUITE');
console.log('=====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

// 1. Cryptography Tests
runTest('AES-256-GCM Encryption & Decryption Roundtrip', () => {
  const clinicalData = {
    patientCondition: 'Critical End-Stage Organ Failure',
    biopsyResults: 'HLA Class I and II crossmatch negative',
    icd10Code: 'I42.0'
  };
  const ciphertext = encrypt(clinicalData);
  assert(ciphertext && ciphertext.includes(':'), 'Ciphertext must follow iv:tag:data format');
  const decrypted = decrypt(ciphertext);
  assert.deepStrictEqual(decrypted, clinicalData, 'Decrypted object must match original payload');
});

runTest('SHA-256 Tamper-Evident Hash Chaining', () => {
  const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const block1 = { action: 'ORGAN_REGISTERED', id: 'DNR-1001' };
  const hash1 = hashPayload(block1, genesisHash);
  assert(hash1 && hash1.length === 64, 'Hash must be 64-char hex string');

  const block2 = { action: 'MATCH_COMPUTED', matchScore: 92 };
  const hash2 = hashPayload(block2, hash1);
  assert(hash2 !== hash1, 'Subsequent block must chain with distinct hash');
});

runTest('Cryptographic Delivery Key Format', () => {
  const key = generateDeliveryKey();
  assert(/^ORGDEL-[0-9A-F]{8}-[0-9A-Z]{4}$/.test(key), `Invalid delivery key format: ${key}`);
});

// 2. Blood Group Compatibility Tests
runTest('Blood Compatibility: O- is Universal Donor', () => {
  const targets = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  targets.forEach(rcp => {
    const res = evaluateBloodCompatibility('O-', rcp);
    assert.strictEqual(res.compatible, true, `O- must be compatible with ${rcp}`);
  });
});

runTest('Blood Compatibility: AB+ is Universal Recipient', () => {
  const donors = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  donors.forEach(dnr => {
    const res = evaluateBloodCompatibility(dnr, 'AB+');
    assert.strictEqual(res.compatible, true, `${dnr} must be compatible to donate to AB+`);
  });
});

runTest('Blood Compatibility: Incompatible Pairs Disqualified', () => {
  const res1 = evaluateBloodCompatibility('A+', 'B+');
  assert.strictEqual(res1.compatible, false, 'A+ must NOT be compatible with B+');

  const res2 = evaluateBloodCompatibility('B+', 'A+');
  assert.strictEqual(res2.compatible, false, 'B+ must NOT be compatible with A+');

  const res3 = evaluateBloodCompatibility('AB+', 'O+');
  assert.strictEqual(res3.compatible, false, 'AB+ must NOT be compatible with O+');
});

// 3. HLA Tissue Typing Tests
runTest('HLA Loci Concordance Evaluation', () => {
  const donorHLA = {
    hlaA: 'A*02, A*24',
    hlaB: 'B*07, B*44',
    hlaDR: 'DRB1*04, DRB1*15'
  };
  const recipientHLA = {
    hlaA: 'A*02, A*03',
    hlaB: 'B*07, B*08',
    hlaDR: 'DRB1*04, DRB1*07'
  };
  const hlaRes = evaluateHLAMatch(donorHLA, recipientHLA);
  assert(hlaRes.matchedLoci >= 3, 'Must match common alleles across 3 loci');
  assert(hlaRes.score > 0, 'HLA score must be positive');
});

// 4. Cold Ischemia Time & Distance Feasibility
runTest('Cold Ischemia Time: Heart Safe vs Exceeded Bounds', () => {
  const donorCoords = { latitude: 40.7128, longitude: -74.0060 }; // NYC
  const nearCoords = { latitude: 39.9526, longitude: -75.1652 };  // Philly (~130 km)
  const farCoords = { latitude: 34.0522, longitude: -118.2437 }; // LA (~3900 km)

  const nearRes = evaluateTransitCIT(donorCoords, nearCoords, 'Heart', new Date(), 4);
  assert.strictEqual(nearRes.citFeasible, true, 'NYC to Philly should be within safe CIT for Heart');

  // If harvested 5 hours ago for Heart (max safe limit is 6h), should be near expiration
  const harvestOld = new Date(Date.now() - 5.5 * 60 * 60 * 1000);
  const lateRes = evaluateTransitCIT(donorCoords, nearCoords, 'Heart', harvestOld, 4);
  assert.strictEqual(lateRes.citFeasible, false, 'Harvested 5.5h ago + transit must exceed Heart 6h limit');
});

// 5. Full End-to-End Matching Engine Scoring
runTest('Full Composite Match Scoring for Emergency Patient', () => {
  const donor = {
    organType: 'Heart',
    bloodType: 'O+',
    donorAge: 25,
    harvestTime: new Date(Date.now() - 30 * 60 * 1000),
    maxColdIschemiaHours: 4,
    hlaTyping: { hlaA: 'A*02', hlaB: 'B*07' }
  };
  const recipient = {
    organNeeded: 'Heart',
    bloodType: 'O+',
    patientAge: 30,
    urgencyLevel: 'Status 1A (Emergency)',
    medicalSeverityScore: 35,
    waitingListEntryDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    hlaTyping: { hlaA: 'A*02', hlaB: 'B*07' }
  };
  const hosp1 = { coordinates: { latitude: 40.74, longitude: -73.97 } };
  const hosp2 = { coordinates: { latitude: 39.95, longitude: -75.19 } };

  const match = computeMatchScore(donor, recipient, hosp1, hosp2);
  assert(match.matchScore >= 80, `Expected matchScore >= 80 for emergency identical match, got ${match.matchScore}`);
  assert.strictEqual(match.isCompatible, true);
  assert.strictEqual(match.isRecommended, true);
  assert(match.scoreBreakdown.bloodGroupScore === 30, 'Identical blood match must receive 30 pts');
});

console.log(`\n=====================================================`);
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log(`=====================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
