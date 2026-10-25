const crypto = require('crypto');

// AES-256-GCM requires a 32-byte key and a 12 or 16-byte IV
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_HEX = process.env.AES_SECRET_KEY || '9f8e7d6c5b4a3928172635445362718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8';
const KEY = Buffer.from(KEY_HEX, 'hex');

/**
 * Encrypt any object or string using AES-256-GCM
 */
function encrypt(data) {
  if (data === null || data === undefined) return null;
  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedPayload
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string back to raw text or parsed JSON
 */
function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.includes(':')) {
    return ciphertext;
  }
  
  try {
    const [ivHex, authTagHex, encryptedData] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !encryptedData) return ciphertext;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try parsing as JSON if possible
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

/**
 * Compute SHA-256 hash of a payload (for tamper-evident audit ledger)
 */
function hashPayload(payload, previousHash = 'GENESIS_ROOT_HASH_ORGANEASE') {
  const content = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  return crypto.createHash('sha256').update(`${previousHash}:${content}`).digest('hex');
}

/**
 * Generate high-entropy delivery handshake OTP / cryptographic verification key
 */
function generateDeliveryKey() {
  const prefix = 'ORGDEL';
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${randomPart}-${timestampPart}`;
}

module.exports = {
  encrypt,
  decrypt,
  hashPayload,
  generateDeliveryKey
};
