import { randomBytes } from 'crypto';

/**
 * Relay email username validation pattern
 * - Must start and end with alphanumeric characters
 * - Can contain dots (.) and hyphens (-) only in the middle
 * - Single character usernames are allowed
 */
export const RELAY_USERNAME_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

/**
 * Validate relay email username
 * @param username - The username to validate
 * @returns true if valid, false otherwise
 */
export function isValidRelayUsername(username: string): boolean {
  return RELAY_USERNAME_PATTERN.test(username);
}

/**
 * Generate a random relay email username
 * Generates a random alphanumeric string that complies with RELAY_USERNAME_PATTERN
 * @param length - The length of the username (default: 16)
 * @returns A random username string
 */
export function generateRandomRelayUsername(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}

/**
 * Error message for invalid relay username
 */
export const RELAY_USERNAME_ERROR_MESSAGE =
  'Username must start and end with alphanumeric characters, and can only contain letters, numbers, dots, and hyphens';
