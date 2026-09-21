import crypto from 'crypto';

export function verifyHmacSha256(payload: string, signature: string, secret: string): boolean {
  try {
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

    if (signatureBuffer.length !== calculatedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
  } catch (error) {
    return false;
  }
}
