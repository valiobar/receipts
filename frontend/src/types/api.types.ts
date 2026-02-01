import type { Receipt } from './receipt.types';
import type { Device } from './device.types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Response types for API endpoints

export interface ReceiptsResponse {
  receipts: Receipt[];
  pagination: Pagination;
}

export interface ReceiptResponse {
  receipt: Receipt;
}

export interface DevicesResponse {
  devices: Device[];
  summary?: {
    total: number;
    online: number;
    offline: number;
  };
}

export interface DeviceResponse {
  device: Device;
}

export interface DeviceStatusResponse {
  deviceId: string;
  online: boolean;
  lastSeen?: string;
  status: string;
  pendingCommands: number;
  lastCommand?: {
    id: number;
    type: string;
    status: string;
    timestamp: string;
  };
}

export interface CommandResponse {
  commandId: number;
  deviceId: string;
  type: string;
  status: string;
  createdAt: string;
  message?: string;
}

export interface SystemStatusResponse {
  status: string;
  uptime: number;
  version: string;
  database: {
    connected: boolean;
    latency: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
  };
  commands: {
    pending: number;
    processing: number;
  };
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn?: number;
}

