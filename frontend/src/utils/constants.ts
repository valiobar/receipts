/**
 * API base URL from environment variable
 * Defaults to /api for production or http://localhost:3000/api for development
 */
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

/**
 * WebSocket URL from environment variable
 * Defaults to ws://localhost:3000 for development or empty for production (relative)
 */
export const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:3000' : '');

/**
 * Application constants
 */
export const APP_NAME = 'Receipt Management System';

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

/**
 * Date format constants
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Receipt status options
 */
export const RECEIPT_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
} as const;

/**
 * Device command types
 */
export const COMMAND_TYPES = {
  DAILY: 'daily',
  PERIOD: 'period',
  CMD: 'cmd',
  DAILY_X: 'daily-X',
  SPAD_NAPREJENIE: 'spad-naprejenie',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  SUPER: 'Super',
} as const;


