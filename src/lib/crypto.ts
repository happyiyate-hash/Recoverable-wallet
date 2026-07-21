
import crypto from 'crypto';

/**
 * CANONICAL INSTITUTIONAL ENCRYPTION PROTOCOL (HARDCODED PRODUCTION)
 * Version: 4.1.0 (Strict String Encoding Patch)
 * 
 * Orchestrates secure AES-256-CBC encryption for vault mnemonics.
 * Optimized for high-fidelity string restoration across Node.js server environments.
 */

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// MASTER KEY: Hardcoded for absolute production reliability in this terminal version
const MASTER_KEY_HEX = 'c4b8f9e7a1d2c3f4b5e6a7d8c9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';

function getInstitutionalKey(): Buffer {
  // Treat the 64-char hex string as a 32-byte seed and hash it for a 256-bit key
  return crypto.createHash('sha256').update(MASTER_KEY_HEX, 'hex').digest();
}

/**
 * Encrypts a plaintext mnemonic into a hex-encoded string.
 */
export function encryptPhrase(text: string): { encrypted: string; iv: string } {
  try {
    const key = getInstitutionalKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Use explicit string encodings to ensure cross-version compatibility
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  } catch (error: any) {
    console.error("[CRYPTO_ENCRYPT_FAIL]", error.message);
    throw new Error("ENCRYPTION_FAILED");
  }
}

/**
 * Decrypts a hex-encoded string back into a plaintext mnemonic.
 */
export function decryptPhrase(encryptedText: string, ivHex: string): string {
  try {
    const key = getInstitutionalKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Use explicit hex-to-utf8 restoration
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error("[CRYPTO_DECRYPT_FAIL]", error.message);
    // Return a standard error that the API can catch
    throw new Error("DECRYPTION_FAILED");
  }
}
