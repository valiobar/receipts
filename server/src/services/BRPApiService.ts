import logger from '../config/winston';
import type {
  BRPAuthToken,
  BRPLoginRequest,
  BRPLoginResponse,
  BRPLoginResponseData,
  BRPCustomer,
  BRPSubscription,
  BRPCustomerSubscriptionsResponse,
} from '../types/brp-api';

/**
 * BRP Main API Service
 * Handles authentication and API requests to BRP main API
 */
class BRPApiService {
  private baseURL: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;
  private token: BRPAuthToken | null = null;
  private refreshPromise: Promise<void> | null = null; // Prevent concurrent refreshes

  constructor() {
    this.baseURL = process.env.BRP_API_URL || '';
    this.apiKey = process.env.BRP_API_KEY;
    this.username = process.env.BRP_API_USERNAME;
    this.password = process.env.BRP_API_PASSWORD;
  }

  /**
   * Check if BRP API is configured
   */
  isConfigured(): boolean {
    logger.info('Checking if BRP API is configured', {
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      username: this.username,
      password: this.password,
    });
    return !!(
      this.baseURL &&
      this.apiKey &&
      this.username &&
      this.password
    );
  }

  /**
   * Login to BRP API and obtain authentication token
   * Endpoint: POST /api/ver3/auth/login
   */
  async login(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('BRP API not configured - missing required environment variables');
    }

    const loginPayload: BRPLoginRequest = {
      username: this.username!,
      password: this.password!,
    };

    logger.info('Logging in to BRP API...', {
      baseURL: this.baseURL,
      username: this.username,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // // Add API key if provided (may be in header or query parameter)
    // if (this.apiKey) {
    //   headers['X-API-Key'] = this.apiKey;
    //   // Also try as Authorization header if needed
    //   // headers['Authorization'] = `Bearer ${this.apiKey}`;
    // }

    // Try with API key in query parameter first
    const url = new URL(`${this.baseURL}/api/ver3/auth/login`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(loginPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('BRP API login failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`BRP API login failed: ${response.status} - ${errorText}`);
    }

    const responseData = (await response.json()) as BRPLoginResponse;
    logger.info('BRP API login response', {
      data: responseData,
    });
    
    // Handle both wrapped and unwrapped responses
    const loginData: BRPLoginResponseData = 'data' in responseData 
      ? (responseData as { data: BRPLoginResponseData }).data 
      : (responseData as BRPLoginResponseData);
    this.updateTokenFromResponse(loginData);

    logger.info('BRP API login successful', {
      hasToken: !!this.token?.token,
      hasRefreshToken: !!this.token?.refreshToken,
      expiresAt: this.token?.expiresAt,
    });
  }

  /**
   * Get valid authentication token, refreshing if needed
   */
  async getAuthToken(): Promise<string> {
    // Check if token exists and is valid
    if (this.token && this.isTokenValid(this.token)) {
      return this.token.token;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      await this.refreshPromise;
      if (this.token && this.isTokenValid(this.token)) {
        return this.token.token;
      }
    }

    // Start refresh/re-login process
    this.refreshPromise = this.refreshOrLogin();
    await this.refreshPromise;
    this.refreshPromise = null;

    if (!this.token) {
      throw new Error('Failed to obtain authentication token');
    }

    return this.token.token;
  }

  /**
   * Refresh token or re-login if refresh fails
   */
  private async refreshOrLogin(): Promise<void> {
    try {
      // Try refresh first (BRP API has refresh endpoint)
      if (this.token?.refreshToken) {
        await this.refreshToken();
      } else {
        // No refresh token available, do full login
        await this.login();
      }
    } catch (error) {
      // If refresh fails (e.g., refresh token expired), try full login
      logger.warn('Token refresh failed, attempting full login', {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.login();
    }
  }

  /**
   * Check if token is valid (not expired, with 5-minute buffer)
   */
  private isTokenValid(token: BRPAuthToken): boolean {
    if (!token.expiresAt) {
      // If no expiration info, assume valid (may need adjustment based on API)
      return true;
    }

    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    return token.expiresAt > now + bufferMs;
  }

  /**
   * Refresh token using BRP API refresh endpoint
   * Endpoint: POST /api/ver3/auth/refresh
   */
  private async refreshToken(): Promise<void> {
    if (!this.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    logger.debug('Refreshing BRP API token...');

    // TODO: Verify exact request format from BRP API documentation
    // Common formats: { refreshToken: string } or { token: string } or { refresh_token: string }
    const requestBody = {
      refreshToken: this.token.refreshToken,
      // May also need: grant_type: 'refresh_token' or other fields
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Try with API key in query parameter
    const url = new URL(`${this.baseURL}/api/ver3/auth/refresh`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const responseData = (await response.json()) as BRPLoginResponse;
    
    // Handle both wrapped and unwrapped responses
    const refreshData: BRPLoginResponseData = 'data' in responseData 
      ? (responseData as { data: BRPLoginResponseData }).data 
      : (responseData as BRPLoginResponseData);
    this.updateTokenFromResponse(refreshData);

    logger.debug('Token refreshed successfully', {
      hasNewToken: !!refreshData.access_token,
      hasNewRefreshToken: !!refreshData.refresh_token,
    });
  }

  /**
   * Update token from login/refresh response
   */
  private updateTokenFromResponse(data: BRPLoginResponseData): void {
    const token = data.access_token;
    if (!token) {
      throw new Error('No token in login response');
    }

    // Calculate expiration time from expires_in (in seconds)
    const expiresAt = data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined;

    this.token = {
      token,
      expiresAt,
      refreshToken: data.refresh_token || this.token?.refreshToken, // Keep existing refresh token if not provided
    };
  }

  /**
   * Make authenticated request to BRP API
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    // Add API key if provided
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const url = new URL(`${this.baseURL}${endpoint}`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });
    logger.info('BRP API response', {
      response,
    });
    // Handle 401 - token expired, refresh and retry once
    if (response.status === 401) {
      logger.warn('Received 401, refreshing token and retrying...');
      // Clear current token
      this.token = null;
      // Get new token
      const newToken = await this.getAuthToken();
      // Retry request with new token
      headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await fetch(url.toString(), {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text().catch(() => 'Unknown error');
        throw new Error(
          `BRP API request failed after retry: ${retryResponse.status} - ${errorText}`
        );
      }

      return (await retryResponse.json()) as T;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`BRP API request failed: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Get customer by ID
   * Endpoint: GET /api/ver3/customers/{id}
   */
  async getCustomerById(id: string | number): Promise<BRPCustomer> {
    if (!this.isConfigured()) {
      throw new Error('BRP API not configured');
    }

    logger.debug('Fetching customer from BRP API', { customerId: id });
    return this.makeAuthenticatedRequest<BRPCustomer>(`/api/ver3/customers/${id}`);
  }

  /**
   * Get customer subscriptions
   * Endpoint: GET /api/ver3/customers/{customer}/subscriptions
   */
  async getCustomerSubscriptions(customerId: string | number): Promise<BRPSubscription[]> {
    if (!this.isConfigured()) {
      throw new Error('BRP API not configured');
    }

    logger.debug('Fetching customer subscriptions from BRP API', { customerId });
    const response = await this.makeAuthenticatedRequest<BRPCustomerSubscriptionsResponse>(
      `/api/ver3/customers/${customerId}/subscriptions`
    );

    // Handle both wrapped and unwrapped responses
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: BRPSubscription[] }).data;
    }
    return [];
  }

  /**
   * Logout and clear authentication token
   */
  async logout(): Promise<void> {
    if (this.token) {
      logger.info('Logging out from BRP API...');
      this.token = null;
      logger.debug('BRP API logout successful');
    }
  }
}

// Export singleton instance
export const brpApiService = new BRPApiService();
export { BRPApiService };
export default brpApiService;

