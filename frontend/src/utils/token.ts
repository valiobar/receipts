const TOKEN_KEY = 'auth_token';

/**
 * Get authentication token from localStorage
 * @returns Token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('[getToken] Error getting token from localStorage:', error);
    return null;
  }
};

/**
 * Store authentication token in localStorage
 * @param token - JWT token string
 */
export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting token in localStorage:', error);
  }
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token from localStorage:', error);
  }
};

/**
 * Check if user has a valid token
 * @returns True if token exists
 */
export const hasToken = (): boolean => {
  return getToken() !== null;
};

/**
 * Decode JWT token payload without verification
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeTokenPayload = <T = unknown>(token: string): T | null => {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (second part)
    let payload = parts[1];
    
    // Base64 URL decode: replace URL-safe characters and add padding if needed
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed (base64 requires length to be multiple of 4)
    while (payload.length % 4) {
      payload += '=';
    }
    
    const decoded = atob(payload);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.error('Error decoding token payload:', error);
    return null;
  }
};


