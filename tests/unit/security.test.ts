import { describe, it, expect } from 'vitest';
import { encryptCredentials, decryptCredentials, maskPII } from '../../src/utils/security';

describe('Security Utility', () => {
  describe('AES-GCM-256 Encryption & Decryption', () => {
    const validMasterKey = '12345678901234567890123456789012'; // 32 bytes
    const plainText = 'super-secret-api-key-from-shopee';

    it('should encrypt and successfully decrypt back to original text', () => {
      const cipherText = encryptCredentials(plainText, validMasterKey);
      expect(cipherText).not.toBe(plainText);
      expect(cipherText.split(':').length).toBe(3); // IV:Encrypted:AuthTag

      const decrypted = decryptCredentials(cipherText, validMasterKey);
      expect(decrypted).toBe(plainText);
    });

    it('should throw an error if master key is not 32 bytes during encryption', () => {
      const invalidKey = 'short-key';
      expect(() => encryptCredentials(plainText, invalidKey)).toThrow('Encryption master key must be exactly 32 characters/bytes long.');
    });

    it('should throw an error if master key is not 32 bytes during decryption', () => {
      const invalidKey = 'short-key';
      const cipherText = 'fake-iv:fake-encrypted:fake-auth';
      expect(() => decryptCredentials(cipherText, invalidKey)).toThrow('Encryption master key must be exactly 32 characters/bytes long.');
    });

    it('should fail to decrypt if auth tag is modified (tamper evident)', () => {
      const cipherText = encryptCredentials(plainText, validMasterKey);
      const parts = cipherText.split(':');
      parts[2] = '00000000000000000000000000000000'; // Tampered AuthTag
      const tamperedCipherText = parts.join(':');

      expect(() => decryptCredentials(tamperedCipherText, validMasterKey)).toThrow(); // Should throw auth failure
    });
  });

  describe('PII Masking (UU PDP)', () => {
    it('should mask standard 10-14 digit phone numbers', () => {
      const input1 = 'Hubungi saya di 081234567890 untuk komplain';
      const output1 = maskPII(input1);
      expect(output1).toBe('Hubungi saya di 081*****7890 untuk komplain');

      const input2 = 'My number +628199999999';
      const output2 = maskPII(input2);
      expect(output2).toBe('My number +6281****9999');
    });

    it('should naively mask names starting with capital letters (first and last name)', () => {
      const input = 'pelanggan Budi Santoso marah karena paket telat';
      const output = maskPII(input);
      expect(output).toBe('pelanggan B*** S****** marah karena paket telat');
    });

    it('should return original text if it is empty', () => {
      expect(maskPII('')).toBe('');
    });
  });
});
