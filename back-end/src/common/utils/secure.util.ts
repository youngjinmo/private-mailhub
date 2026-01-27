import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CustomEnvService } from '../../config/custom-env.service';

@Injectable()
export class SecureUtil {
    private readonly ENCRYPT_ALGORITHM = 'aes-256-gcm';
    private readonly HASH_ALGORITHM = 'sha256';
    private readonly ENCODE_ALGORITHM = 'base64';
    private readonly DIGEST_ALGORITHM = 'hex';
    private readonly IV_LENGTH = 16; // 16 bytes for AES
    private readonly encryptKey: string;

    constructor(
        private readonly customEnvService: CustomEnvService
    ) {
        this.encryptKey = this.customEnvService.get<string>('ENCRYPTION_KEY');
    }

    /**
    * Encrypt plaintext using AES-256-GCM
    * @param plaintext - The text to encrypt
    * @returns Encrypted data in format: encrypted:iv:authTag (all base64)
    */
    encrypt(plaintext: string): string {
        try {
            // Decode the base64 key to buffer
            const keyBuffer = Buffer.from(this.encryptKey, this.ENCODE_ALGORITHM);
        
            if (keyBuffer.length !== 32) {
              throw new Error('Encryption key must be 32 bytes (256 bits)');
            }
        
            // Generate random IV
            const iv = crypto.randomBytes(this.IV_LENGTH);
        
            // Create cipher
            const cipher = crypto.createCipheriv(this.ENCRYPT_ALGORITHM, keyBuffer, iv);
        
            // Encrypt
            let encrypted = cipher.update(plaintext, 'utf8', this.ENCODE_ALGORITHM);
            encrypted += cipher.final(this.ENCODE_ALGORITHM);
        
            // Get auth tag
            const authTag = cipher.getAuthTag();
        
            // Return format: encrypted:iv:authTag
            return `${encrypted}:${iv.toString(this.ENCODE_ALGORITHM)}:${authTag.toString(this.ENCODE_ALGORITHM)}`;
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
    * Decrypt encrypted data using AES-256-GCM
    * @param encryptedData - Encrypted data in format: encrypted:iv:authTag (all base64)
    * @returns Decrypted plaintext
    */
    decrypt(encryptedData: string): string {
        try {
            // Decode the base64 key to buffer
            const keyBuffer = Buffer.from(this.encryptKey, this.ENCODE_ALGORITHM);
  
            if (keyBuffer.length !== 32) {
                throw new Error('Encryption key must be 32 bytes (256 bits)');
            }
  
            // Parse encrypted:iv:authTag format
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format. Expected: encrypted:iv:authTag');
            }
  
            const [encrypted, ivBase64, authTagBase64] = parts;
  
            // Decode from base64
            const iv = Buffer.from(ivBase64, this.ENCODE_ALGORITHM);
            const authTag = Buffer.from(authTagBase64, this.ENCODE_ALGORITHM);
  
            // Create decipher
            const decipher = crypto.createDecipheriv(this.ENCRYPT_ALGORITHM, keyBuffer, iv);
            decipher.setAuthTag(authTag);
  
            // Decrypt
            let decrypted = decipher.update(encrypted, this.ENCODE_ALGORITHM, 'utf8');
            decrypted += decipher.final('utf8');
  
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Hash data using SHA-256
     * @param plaintext - The text to hash
     * @returns Hashed text by SHA-256
     */
    hash(plaintext: string): string {
        return crypto.createHash(this.HASH_ALGORITHM).update(plaintext).digest(this.DIGEST_ALGORITHM);
    }

    /**
    * Generate a new random encryption key
    * @returns Base64 encoded 32-byte key
    */
    generateKey(): string {
        return crypto.randomBytes(32).toString(this.ENCODE_ALGORITHM);
    }
}

