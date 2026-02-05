import axios, { AxiosInstance } from 'axios';
import { getToken, removeToken } from '@/utils/token';
import { API_URL } from '@/utils/constants';
import type {
  ApiResponse,
  LoginResponse,
  RefreshTokenResponse,
  Receipt,
  ReceiptFilters,
  ReceiptsResponse,
  ReceiptResponse,
  Device,
  DevicesResponse,
  DeviceResponse,
  DeviceStatusResponse,
  DeviceCommand,
  CommandResponse,
  SystemStatusResponse,
} from '@/types';

/**
 * Centralized REST API client using Axios
 * Handles authentication, error handling, and request/response interceptors
 */
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor: Add Authorization header with token
    this.client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear token and redirect to login
          removeToken();
          // Only redirect if we're not already on the login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== Authentication ====================

  /**
   * Authenticate user and receive JWT token
   */
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.client.post('/auth/login', { username, password });
  }

  /**
   * Refresh JWT token before expiration
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    return this.client.post('/auth/refresh');
  }

  /**
   * Invalidate current token (logout)
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.client.post('/auth/logout');
  }

  // ==================== Receipts ====================

  /**
   * Retrieve list of receipts with filtering and pagination
   */
  async getReceipts(params?: ReceiptFilters): Promise<ApiResponse<ReceiptsResponse>> {
    return this.client.get('/receipts', { params });
  }

  /**
   * Retrieve a specific receipt by ID
   */
  async getReceipt(id: string): Promise<ApiResponse<ReceiptResponse>> {
    return this.client.get(`/receipts/${id}`);
  }

  /**
   * Export receipts to Excel file
   */
  async exportReceipts(params: {
    startDate: string;
    endDate: string;
    deviceId?: string;
    format?: 'xlsx' | 'csv';
  }): Promise<Blob> {
    const response = await this.client.get('/receipts/export', {
      params,
      responseType: 'blob',
    });
    return response as unknown as Blob;
  }

  // ==================== Devices ====================

  /**
   * Retrieve list of all devices with their status
   */
  async getDevices(params?: {
    online?: boolean;
    location?: string;
  }): Promise<ApiResponse<DevicesResponse>> {
    return this.client.get('/devices', { params });
  }

  /**
   * Retrieve a specific device by ID
   */
  async getDevice(id: string): Promise<ApiResponse<DeviceResponse>> {
    return this.client.get(`/devices/${id}`);
  }

  /**
   * Get real-time status of a device
   */
  async getDeviceStatus(id: string): Promise<ApiResponse<DeviceStatusResponse>> {
    return this.client.get(`/devices/${id}/status`);
  }

  /**
   * Send a command to a device
   */
  async sendDeviceCommand(
    deviceId: string,
    command: DeviceCommand
  ): Promise<ApiResponse<CommandResponse>> {
    return this.client.post(`/devices/${deviceId}/command`, command);
  }

  // ==================== System ====================

  /**
   * Get system status and health information
   */
  async getSystemStatus(): Promise<ApiResponse<SystemStatusResponse>> {
    return this.client.get('/system/status');
  }
}

export const apiService = new ApiService();

