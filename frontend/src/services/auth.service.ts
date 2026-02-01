import { apiService } from './api.service';
import { setToken, getToken, removeToken } from '@/utils/token';
import type { User, LoginCredentials } from '@/types';

/**
 * Authentication service for handling login, logout, and token management
 */
class AuthService {
  /**
   * Authenticate user and store token
   * @param credentials - Login credentials (username and password)
   * @returns User data and token
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiService.login(credentials.username, credentials.password);

    if (response.success && response.data?.token) {
      setToken(response.data.token);
      return {
        user: response.data.user,
        token: response.data.token,
      };
    }

    throw new Error(response.error?.message || 'Login failed');
  }

  /**
   * Logout user and clear token
   */
  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } finally {
      removeToken();
    }
  }

  /**
   * Refresh JWT token before expiration
   * @returns New token string
   */
  async refreshToken(): Promise<string> {
    const response = await apiService.refreshToken();

    if (response.success && response.data?.token) {
      setToken(response.data.token);
      return response.data.token;
    }

    throw new Error('Token refresh failed');
  }

  /**
   * Check if user is authenticated (has valid token)
   * @returns True if token exists
   */
  isAuthenticated(): boolean {
    return !!getToken();
  }
}

export const authService = new AuthService();

