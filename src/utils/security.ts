import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plain text string (e.g. store credentials) using AES-GCM-256
 * Requires a 32-byte master key.
 */
export function encryptCredentials(plainText: string, masterKey: string): string {
  if (!masterKey || masterKey.length !== 32) {
    throw new Error('Encryption master key must be exactly 32 characters/bytes long.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(masterKey, 'utf8'), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  // Combine IV, encrypted payload, and AuthTag in a single string delimited by ':'
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypts a cipher text encrypted by `encryptCredentials`.
 */
export function decryptCredentials(cipherText: string, masterKey: string): string {
  if (!masterKey || masterKey.length !== 32) {
    throw new Error('Encryption master key must be exactly 32 characters/bytes long.');
  }

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher text format. Expected IV:EncryptedText:AuthTag');
  }

  const [ivHex, encryptedHex, authTagHex] = parts;
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(masterKey, 'utf8'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks PII (Personally Identifiable Information) according to UU PDP No. 27/2022.
 * Names: "Budi Santoso" -> "B*** S******"
 * Phones: "081234567890" -> "0812****7890"
 */
export function maskPII(text: string): string {
  if (!text) return text;
  
  let masked = text;
  
  // Mask typical phone numbers (10 to 14 digits)
  // Use non-greedy or exact length where possible to ensure last 4 digits are kept if length allows
  masked = masked.replace(/(\+?62|0)(8\d)(\d+)(\d{4})/g, (match, p1, p2, p3, p4) => {
    return `${p1}${p2}${'*'.repeat(p3.length)}${p4}`;
  });

  // Mask names (very naive implementation for demonstration, assumes 2+ words starting with capital letters)
  // We'll require at least two adjacent capitalized words to avoid masking random words at the start of a sentence.
  masked = masked.replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, (match, p1, p2) => {
    const maskWord = (w: string) => w.length > 2 ? w[0] + '*'.repeat(w.length - 1) : w;
    return `${maskWord(p1)} ${maskWord(p2)}`;
  });

  return masked;
}
