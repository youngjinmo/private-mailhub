// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Send verification code to the user's email
 * @param email - User's email address
 */
export async function sendVerificationCode(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/users/send-verification-code?username=${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to send verification code');
  }
}

/**
 * Verify the code entered by the user
 * @param email - User's email address
 * @param code - Verification code
 * @returns true if verification is successful, false otherwise
 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/users/verify-code?username=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to verify code');
  }

  return await response.json();
}
