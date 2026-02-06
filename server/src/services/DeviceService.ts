import { Device, IDeviceDocument } from '../models';
import logger from '../config/winston';

// Device with online status
export interface DeviceWithStatus extends Omit<IDeviceDocument, 'status'> {
  online: boolean;
  lastSeen?: Date;
  status: boolean | 'ready' | 'processing' | 'error' | 'noPapper'; // Can be boolean from DB or DeviceStatus from ConnectionManager
}

// Device status information
export interface DeviceStatusInfo {
  deviceId: string;
  online: boolean;
  lastSeen?: Date;
  status: 'ready' | 'processing' | 'error' | 'noPapper';
  pendingCommands: number;
  lastCommand?: {
    id: string;
    type: string;
    status: string;
    timestamp: Date;
  };
}

/**
 * DeviceService - Manages device information and status
 */
class DeviceService {
  // Store connection manager reference (will be set in Phase 5)
  private connectionManager: any = null;

  /**
   * Set connection manager (called from Phase 5)
   */
  setConnectionManager(connectionManager: any): void {
    this.connectionManager = connectionManager;
  }

  /**
   * Get all devices with online status
   */
  async getAllDevices(filters?: {
    online?: boolean;
    location?: string;
  }): Promise<DeviceWithStatus[]> {
    const query: Record<string, unknown> = {};

    if (filters?.location) {
      query.$or = [
        { location: filters.location },
        { name: filters.location },
      ];
    }

    const devices = await Device.find(query).exec();
    const onlineDevices = this.connectionManager
      ? this.connectionManager.getOnlineDevices()
      : [];

    let result = devices.map((device) => {
      const isOnline = onlineDevices.includes(device.deviceId);
      const deviceStatus = this.connectionManager
        ? this.connectionManager.getDeviceStatus(device.deviceId)
        : null;

      return {
        ...device.toObject(),
        online: isOnline,
        lastSeen: deviceStatus?.lastSeen || device.lastSeen,
        // Override status with real-time status from ConnectionManager if available
        // Otherwise keep the database boolean status (will be transformed on frontend)
        status: deviceStatus?.status !== undefined ? deviceStatus.status : device.status,
      } as DeviceWithStatus;
    });

    // Filter by online status if specified
    if (filters?.online !== undefined) {
      result = result.filter((device) => device.online === filters.online);
    }

    return result;
  }

  /**
   * Get device by ID with online status
   */
  async getDeviceById(deviceId: string): Promise<DeviceWithStatus | null> {
    const device = await Device.findOne({ deviceId }).exec();
    
    if (!device) {
      logger.debug('Device not found', { deviceId });
      return null;
    }

    const onlineDevices = this.connectionManager
      ? this.connectionManager.getOnlineDevices()
      : [];
    const isOnline = onlineDevices.includes(deviceId);

    const deviceObj = device.toObject() as DeviceWithStatus;
    deviceObj.online = isOnline;

    // Get last seen from connection manager if available
    if (this.connectionManager) {
      const deviceStatus = this.connectionManager.getDeviceStatus(deviceId);
      if (deviceStatus) {
        deviceObj.lastSeen = deviceStatus.lastSeen;
      }
    }

    return deviceObj;
  }

  /**
   * Get device status information
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatusInfo | null> {
    const device = await Device.findOne({ deviceId }).exec();
    
    if (!device) {
      return null;
    }

    const onlineDevices = this.connectionManager
      ? this.connectionManager.getOnlineDevices()
      : [];
    const isOnline = onlineDevices.includes(deviceId);

    // Get device status from connection manager
    let lastSeen: Date | undefined;
    let status: 'ready' | 'processing' | 'error' | 'noPapper' = 'ready';
    
    if (this.connectionManager) {
      const deviceStatus = this.connectionManager.getDeviceStatus(deviceId);
      if (deviceStatus) {
        lastSeen = deviceStatus.lastSeen;
        status = deviceStatus.status || 'ready';
      }
    }

    // Get pending commands count (import commandService)
    const { commandService } = await import('./CommandService');
    const pendingCommands = await commandService.getPendingCount(deviceId);

    // Get last command (import Command model)
    const { Command } = await import('../models');
    const lastCommand = await Command.findOne({ deviceId })
      .sort({ ts: -1 })
      .exec();

    return {
      deviceId,
      online: isOnline,
      lastSeen,
      status,
      pendingCommands,
      lastCommand: lastCommand
        ? {
            id: lastCommand._id.toString(),
            type: lastCommand.commandType,
            status: lastCommand.status,
            timestamp: lastCommand.ts,
          }
        : undefined,
    };
  }

  /**
   * Update device status in database
   */
  async updateDeviceStatus(
    deviceId: string,
    updates: {
      status?: boolean;
      lastSeen?: Date;
      metadata?: {
        firmwareVersion?: string;
        model?: string;
      };
    }
  ): Promise<IDeviceDocument | null> {
    const device = await Device.findOne({ deviceId }).exec();
    
    if (!device) {
      logger.warn('Device not found for status update', { deviceId });
      return null;
    }

    if (updates.status !== undefined) {
      device.status = updates.status;
    }

    if (updates.lastSeen) {
      device.lastSeen = updates.lastSeen;
    }

    if (updates.metadata) {
      device.metadata = {
        ...device.metadata,
        ...updates.metadata,
      };
    }

    await device.save();

    logger.debug('Device status updated', {
      deviceId,
      updates,
    });

    return device;
  }

  /**
   * Get device summary (total, online, offline)
   */
  async getDeviceSummary(): Promise<{
    total: number;
    online: number;
    offline: number;
  }> {
    const devices = await this.getAllDevices();
    
    return {
      total: devices.length,
      online: devices.filter((d) => d.online).length,
      offline: devices.filter((d) => !d.online).length,
    };
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
export { DeviceService };
export default deviceService;

