import crypto from 'crypto';
import { SECURITY_CONFIG } from '../config/security';

/**
 * MASTER ADMIN ENCRYPTION UTILITY
 * Version: 1.0.0
 * Specialized for server-side secret management.
 */

const MASTER_KEY = process.env.ADMIN_ENC_KEY || 'c4b8f9e7a1d2c3f4b5e6a7d8c9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';

export function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(SECURITY_CONFIG.encryption.ivLength);
  const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
  const cipher = crypto.createCipheriv(SECURITY_CONFIG.encryption.algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

export function decrypt(encryptedText: string, ivHex: string): string {
  const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(SECURITY_CONFIG.encryption.algorithm, key, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
