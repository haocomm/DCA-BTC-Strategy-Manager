import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY || 'default-key-32-characters-long-1234';

  /**
   * Encrypts sensitive data like API keys and secrets
   */
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
      const cipher = crypto.createCipherGCM(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Failed to encrypt data: ${error}`);
    }
  }

  /**
   * Decrypts sensitive data
   */
  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const key = Buffer.from(this.SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf8');

      const decipher = crypto.createDecipherGCM(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${error}`);
    }
  }

  /**
   * Generates a secure random API key for testing
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates if a string looks like an encrypted value
   */
  static isEncrypted(text: string): boolean {
    const parts = text.split(':');
    return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
  }
}