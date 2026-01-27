/**
 * Utility class for generating various codes
 */
export class CodeUtil {
  /**
   * Generate a 6-digit verification code
   * @returns 6-digit string code (e.g., "123456")
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
