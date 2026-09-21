import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyHmacSha256 } from '../../src/utils/crypto';

describe('Crypto Utility', () => {
  describe('verifyHmacSha256', () => {
    const secret = 'my-webhook-secret-key';
    const payload = JSON.stringify({ event_id: '123', status: 'OK' });
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    it('should return true for a valid signature', () => {
      const isValid = verifyHmacSha256(payload, validSignature, secret);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const invalidSignature = crypto.createHmac('sha256', secret).update(payload + 'tamper').digest('hex');
      const isValid = verifyHmacSha256(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should return false for a completely malformed signature', () => {
      const malformedSignature = 'not-a-hex-string';
      const isValid = verifyHmacSha256(payload, malformedSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should return false if secret is wrong', () => {
      const isValid = verifyHmacSha256(payload, validSignature, 'wrong-secret');
      expect(isValid).toBe(false);
    });
  });
});
