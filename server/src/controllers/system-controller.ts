import { Request, Response } from 'express';
import { connectionManager } from '../managers/ConnectionManager';
import { commandService } from '../services/CommandService';
import { deviceService } from '../services/DeviceService';
import { sendSuccess, sendError } from '../utils/api-response';
import logger from '../config/winston';
import mongoose from 'mongoose';

/**
 * GET /api/system/status
 * Get system status and health information
 */
export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get database status
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1; // 1 = connected
    
    // Get connection stats
    const connectionStats = connectionManager.getConnectionStats();
    
    // Get command statistics
    const commandStats = await commandService.getCommandStatistics();
    
    // Get device statistics
    const devices = await deviceService.getAllDevices();
    const deviceStats = {
      total: devices.length,
      online: devices.filter(d => d.online).length,
      offline: devices.filter(d => !d.online).length,
    };
    
    sendSuccess(req, res, {
      status: 'healthy',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      database: {
        connected: dbConnected,
        latency: dbConnected ? await getDatabaseLatency() : undefined,
      },
      devices: deviceStats,
      commands: commandStats,
    });
  } catch (error) {
    logger.error('Get system status error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/system/debug
 * Get debug information (Super Admin only)
 */
export const getDebugInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const connectionStats = connectionManager.getConnectionStats();
    const onlineDevices = connectionStats.onlineDevices;
    
    // Get device details
    const devices = await deviceService.getAllDevices();
    const deviceDetails = devices
      .filter(d => onlineDevices.includes(d.deviceId))
      .map(device => ({
        location: device.name || device.location || device.deviceId,
        status: connectionManager.isDeviceOnline(device.deviceId) ? 'CONNECTED' : 'DISCONNECTED',
        closed: !connectionManager.isDeviceOnline(device.deviceId),
        id: device.deviceId,
      }));
    
    sendSuccess(req, res, {
      sockets: deviceDetails,
      connections: {
        devices: connectionStats.devices,
        clients: connectionStats.clients,
      },
    });
  } catch (error) {
    logger.error('Get debug info error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * POST /api/system/restart
 * Restart the server (Super Admin only)
 */
export const restartServer = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.warn('Server restart initiated', {
      userId: req.user?.id,
      username: req.user?.username,
    });
    
    sendSuccess(req, res, {
      message: 'Server restart initiated',
    });
    
    // Delay restart to allow response to be sent
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.error('Restart server error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/system/debug/socket/:socketId
 * Open/unlock a socket connection (Super Admin only)
 */
export const unlockSocket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { socketId } = req.params;
    
    // Check if device is online
    const isOnline = connectionManager.isDeviceOnline(socketId);
    
    if (!isOnline) {
      sendError(req, res, 'NOT_FOUND', 'Socket not found or not connected', 404);
      return;
    }
    
    // Socket is already "unlocked" if it's online
    // This endpoint exists for compatibility with old system
    sendSuccess(req, res, {
      message: 'Socket unlocked',
      socketId,
    });
  } catch (error) {
    logger.error('Unlock socket error', {
      error: error instanceof Error ? error.message : String(error),
      socketId: req.params.socketId,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * Get database latency (ping)
 */
async function getDatabaseLatency(): Promise<number> {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    return Date.now() - start;
  } catch {
    return -1;
  }
}

