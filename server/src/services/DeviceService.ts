import { Device, IDeviceDocument } from '../models';
import logger from '../config/winston';

// Device with online status
export interface DeviceWithStatus extends IDeviceDocument {
  online: boolean;
  lastSeen?: Date;
}

// Device status information
export interface DeviceStatusInfo {
  deviceId: string;
  online: boolean;
  lastSeen?: Date;
  status: 'ready' | 'processing' | 'error' | 'noPaper';
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
    const query: any = {};

    if (filters?.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    const devices = await Device.find(query).exec();
    const onlineDevices = this.connectionManager
      ? this.connectionManager.getOnlineDevices()
      : [];

    const devicesWithStatus: DeviceWithStatus[] = devices.map((device) => {
      const isOnline = onlineDevices.includes(device.deviceId);
      const deviceObj = device.toObject() as DeviceWithStatus;
      deviceObj.online = isOnline;
      
      // Get last seen from connection manager if available
      if (this.connectionManager) {
        const deviceStatus = this.connectionManager.getDeviceStatus(device.deviceId);
        if (deviceStatus) {
          deviceObj.lastSeen = deviceStatus.lastSeen;
        }
      }

      return deviceObj;
    });

    // Filter by online status if specified
    if (filters?.online !== undefined) {
      return devicesWithStatus.filter((device) => device.online === filters.online);
    }

    return devicesWithStatus;
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
    let status: 'ready' | 'processing' | 'error' | 'noPaper' = 'ready';
    
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

