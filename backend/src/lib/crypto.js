import crypto from 'node:crypto';
import { config } from '../config/index.js';

// AES-256-GCM for biometric templates at rest. Key is 32 bytes hex in env.
function key() {
  const hex = config.biometricEncKey;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('BIOMETRIC_TEMPLATE_ENC_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(payload) {
  const [iv, tag, data] = payload.split(':').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString();
}

export const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
