import { env } from './env';
import logger from '../config/winston';

/**
 * Get whitelisted IP addresses
 * Uses the webhookIps array from env configuration
 */
export const getWhitelistedIPs = (): string[] => {
  return env.webhookIps;
};

/**
 * Check if IP address is whitelisted
 */
export const isIPWhitelisted = (ip: string): boolean => {
  const whitelist = getWhitelistedIPs();
  
  if (whitelist.length === 0) {
    // If no whitelist configured, allow all (development mode)
    logger.warn('Webhook IP whitelist is empty, allowing all IPs');
    return true;
  }
  
  return whitelist.includes(ip);
};

/**
 * Extract client IP from request
 * Handles proxy headers (x-real-ip, x-forwarded-for)
 */
export const getClientIP = (req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string => {
  // Check x-real-ip header (set by nginx/proxy)
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }
  
  // Check x-forwarded-for header (may contain multiple IPs)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' 
      ? forwardedFor.split(',') 
      : forwardedFor;
    if (ips.length > 0) {
      return ips[0].trim();
    }
  }
  
  // Fallback to Express req.ip
  return req.ip || 'unknown';
};

