// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * API Response wrapper interface
 */
interface ApiResponse<T> {
  result: 'success' | 'fail';
  data: T;
}

/**
 * SessionStorage key for access token
 * Token will persist through page refreshes but cleared when tab is closed
 */
const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * Set the access token in sessionStorage
 */
export function setAccessToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Get the current access token from sessionStorage
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Decode JWT token to get payload
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get username from access token
 */
export function getUsernameFromToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJWT(token);
  return payload?.username || null;
}

/**
 * Clear the access token from sessionStorage
 */
export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}


/**
 * Make an authenticated API request with automatic token refresh
 * The backend JwtAuthGuard automatically refreshes expired access tokens
 * and returns the new token in the X-New-Access-Token response header
 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Add authorization header if access token exists
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include HTTP-only cookies
  });

  // Check if backend refreshed the access token
  const newAccessToken = response.headers.get('X-New-Access-Token');
  if (newAccessToken) {
    setAccessToken(newAccessToken);
  }

  // If still unauthorized after potential refresh, clear token
  if (response.status === 401) {
    clearAccessToken();
  }

  return response;
}

/**
 * Send verification code to the user's email
 * @param username - User's email address
 */
export async function sendVerificationCode(username: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/send-verification-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  const apiResponse: ApiResponse<void> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to send verification code'
    );
  }
}

/**
 * Login with verification code
 * @param username - User's email address
 * @param code - Verification code
 * @returns Access token
 */
export async function login(username: string, code: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include', // Include cookies for refresh token
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, code }),
  });

  const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to login'
    );
  }

  // Store access token in sessionStorage
  const { accessToken } = apiResponse.data;

  setAccessToken(accessToken);
  return accessToken;
}

/**
 * Logout and clear tokens
 */
export async function logout(): Promise<void> {
  // Call backend logout endpoint to remove refresh token from Redis and cookie
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Include access token in Authorization header for authentication
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch (error) {
    // Ignore errors during logout
    console.error('Logout error:', error);
  } finally {
    // Always clear access token from sessionStorage
    clearAccessToken();
  }
}

/**
 * Check if user is authenticated
 * Returns true if access token exists in sessionStorage
 * Note: Token will be automatically refreshed by backend guard on actual API calls
 */
export function checkAuth(): boolean {
  return getAccessToken() !== null;
}

/**
 * Relay Email interfaces
 */
export interface RelayEmail {
  id: string;
  relayAddress: string;
  primaryEmail: string;
  description: string | null;
  isActive: boolean;
  forwardCount: string;
  lastForwardedAt: string | null;
  createdAt: string;
}

/**
 * Get all relay emails for the current user
 */
export async function getRelayEmails(): Promise<RelayEmail[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails`);

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to fetch relay emails'
    );
  }

  const apiResponse: ApiResponse<RelayEmail[]> = await response.json();
  return apiResponse.data;
}

/**
 * Create a new relay email
 * @param primaryEmail - Primary email address to forward to
 */
export async function createRelayEmail(primaryEmail: string): Promise<RelayEmail> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to create relay email'
    );
  }

  const apiResponse: ApiResponse<RelayEmail> = await response.json();
  return apiResponse.data;
}

/**
 * Update relay email description (memo)
 * @param id - Relay email ID
 * @param description - New description (max 20 characters)
 */
export async function updateRelayEmailDescription(
  id: string,
  description: string
): Promise<{ id: string; description: string }> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/relay-emails/${id}/description`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    }
  );

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to update description'
    );
  }

  const apiResponse: ApiResponse<{ id: string; description: string }> = await response.json();
  return apiResponse.data;
}

/**
 * Update relay email active status
 * @param id - Relay email ID
 * @param isActive - New active status
 */
export async function updateRelayEmailActiveStatus(
  id: string,
  isActive: boolean
): Promise<{ id: string; isActive: boolean }> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/relay-emails/${id}/active`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    }
  );

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to update active status'
    );
  }

  const apiResponse: ApiResponse<{ id: string; isActive: boolean }> = await response.json();
  return apiResponse.data;
}
