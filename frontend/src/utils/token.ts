const TOKEN_KEY = 'auth_token';

/**
 * Get authentication token from localStorage
 * @returns Token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token from localStorage:', error);
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

