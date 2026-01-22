import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionUtil {
    private readonly ALGORITHM = 'aes-256-gcm';
    private readonly IV_LENGTH = 16; // 16 bytes for AES
    private readonly AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag

    /**
    * Encrypt plaintext using AES-256-GCM
    * @param plaintext - The text to encrypt
    * @param key - Base64 encoded 32-byte encryption key
    * @returns Encrypted data in format: encrypted:iv:authTag (all base64)
    */
    encrypt(plaintext: string, key: string): string {
        try {
            // Decode the base64 key to buffer
            const keyBuffer = Buffer.from(key, 'base64');
        
            if (keyBuffer.length !== 32) {
              throw new Error('Encryption key must be 32 bytes (256 bits)');
            }
        
            // Generate random IV
            const iv = crypto.randomBytes(this.IV_LENGTH);
        
            // Create cipher
            const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
        
            // Encrypt
            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');
        
            // Get auth tag
            const authTag = cipher.getAuthTag();
        
            // Return format: encrypted:iv:authTag
            return `${encrypted}:${iv.toString('base64')}:${authTag.toString('base64')}`;
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
    * Decrypt encrypted data using AES-256-GCM
    * @param encryptedData - Encrypted data in format: encrypted:iv:authTag (all base64)
    * @param key - Base64 encoded 32-byte encryption key
    * @returns Decrypted plaintext
    */
    decrypt(encryptedData: string, key: string): string {
        try {
        // Decode the base64 key to buffer
        const keyBuffer = Buffer.from(key, 'base64');
  
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
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
  
        // Create decipher
        const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
        decipher.setAuthTag(authTag);
  
        // Decrypt
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
  
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
  }

    /**
    * Generate a new random encryption key
    * @returns Base64 encoded 32-byte key
    */
    generateKey(): string {
        return crypto.randomBytes(32).toString('base64');
    }
}

