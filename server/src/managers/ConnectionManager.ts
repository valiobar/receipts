import { WebSocket } from 'ws';
import logger from '../config/winston';
import { Device } from '../models';

// Device status information
export interface DeviceStatus {
  online: boolean;
  lastSeen: Date;
  status: 'ready' | 'processing' | 'error' | 'noPaper';
  socketId?: string;
}

// Client message types for broadcasting
export interface ReceiptBroadcastMessage {
  MessageId: string;
  UnicSaleNum: string;
  action: 'print';
  price: string;
  user: string;
  location: string;
}

export interface DeviceStatusBroadcastMessage {
  type: 'connect' | 'noPaper' | 'spad-naprejenie';
  location: {
    name: string;
    device: string;
    status: boolean;
  };
}

export interface InfoBroadcastMessage {
  type: 'info';
  message: string;
}

type ClientBroadcastMessage = ReceiptBroadcastMessage | DeviceStatusBroadcastMessage | InfoBroadcastMessage;

/**
 * ConnectionManager - Manages all WebSocket connections
 * Tracks device and client connections, handles message routing
 */
class ConnectionManager {
  // Device connections: deviceId -> WebSocket
  private deviceConnections: Map<string, WebSocket> = new Map();
  
  // Client connections: Set of WebSocket instances
  private clientConnections: Set<WebSocket> = new Set();
  
  // Device status tracking: deviceId -> DeviceStatus
  private deviceStatus: Map<string, DeviceStatus> = new Map();
  
  // Ping intervals: deviceId -> NodeJS.Timeout
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register device connection
   */
  registerDevice(deviceId: string, ws: WebSocket): void {
    // Remove existing connection if any
    this.removeDevice(deviceId);
    
    // Register new connection
    this.deviceConnections.set(deviceId, ws);
    
    // Update status
    this.deviceStatus.set(deviceId, {
      online: true,
      lastSeen: new Date(),
      status: 'ready',
    });
    
    logger.info('Device connected', {
      deviceId,
      totalDevices: this.deviceConnections.size,
    });
    
    // Send connection confirmation
    this.sendToDevice(deviceId, 'CONNECTED');
    
    // Start ping interval (15 seconds)
    this.startPingInterval(deviceId, ws);
    
    // Broadcast device online status to clients
    this.broadcastDeviceStatus(deviceId, true);
  }

  /**
   * Remove device connection
   */
  removeDevice(deviceId: string): void {
    const socket = this.deviceConnections.get(deviceId);
    
    if (socket) {
      // Clear ping interval
      const interval = this.pingIntervals.get(deviceId);
      if (interval) {
        clearInterval(interval);
        this.pingIntervals.delete(deviceId);
      }
      
      // Remove connection
      this.deviceConnections.delete(deviceId);
      
      // Update status
      const status = this.deviceStatus.get(deviceId);
      if (status) {
        this.deviceStatus.set(deviceId, {
          ...status,
          online: false,
          lastSeen: new Date(),
        });
      }
      
      logger.info('Device disconnected', {
        deviceId,
        totalDevices: this.deviceConnections.size,
      });
      
      // Broadcast device offline status to clients
      this.broadcastDeviceStatus(deviceId, false);
    }
  }

  /**
   * Register client connection
   */
  registerClient(ws: WebSocket): void {
    this.clientConnections.add(ws);
    
    logger.info('Client connected', {
      totalClients: this.clientConnections.size,
    });
    
    // Send connection confirmation
    this.broadcastToClients({
      type: 'info',
      message: 'Connected',
    }, ws); // Send only to this client
  }

  /**
   * Remove client connection
   */
  removeClient(ws: WebSocket): void {
    this.clientConnections.delete(ws);
    
    logger.info('Client disconnected', {
      totalClients: this.clientConnections.size,
    });
  }

  /**
   * Send message to specific device
   */
  sendToDevice(deviceId: string, message: string | object): boolean {
    logger.info('Sending message to device', { deviceId, message });
    const ws = this.deviceConnections.get(deviceId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.debug('Device not connected', { deviceId });
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
      
      // Update last seen
      const status = this.deviceStatus.get(deviceId);
      if (status) {
        this.deviceStatus.set(deviceId, {
          ...status,
          lastSeen: new Date(),
        });
      }
      
      return true;
    } catch (error) {
      logger.error('Error sending message to device', {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.removeDevice(deviceId);
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcastToClients(message: ClientBroadcastMessage, targetSocket?: WebSocket): void {
    const targets = targetSocket ? [targetSocket] : Array.from(this.clientConnections);
    
    let sentCount = 0;
    const messageStr = JSON.stringify(message);
    
    targets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sentCount++;
        } catch (error) {
          logger.debug('Error broadcasting to client', {
            error: error instanceof Error ? error.message : String(error),
          });
          this.clientConnections.delete(ws);
        }
      } else {
        this.clientConnections.delete(ws);
      }
    });
    
    if (sentCount > 0) {
      logger.debug('Broadcasted to clients', {
        messageType: 'type' in message ? message.type : 'receipt',
        sentCount,
        totalClients: this.clientConnections.size,
      });
    }
  }

  /**
   * Broadcast device status to clients
   */
  private broadcastDeviceStatus(deviceId: string, online: boolean): void {
    Device.findOne({ deviceId }).exec().then((device) => {
      if (device) {
        this.broadcastToClients({
          type: 'connect',
          location: {
            name: device.name || device.location || deviceId,
            device: deviceId,
            status: online,
          },
        });
      }
    }).catch((error) => {
      logger.error('Error fetching device for status broadcast', {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Start ping interval for device (15 seconds)
   */
  private startPingInterval(deviceId: string, ws: WebSocket): void {
    // Clear existing interval if any
    const existingInterval = this.pingIntervals.get(deviceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToDevice(deviceId, { Action: 'ping' });
      } else {
        clearInterval(interval);
        this.pingIntervals.delete(deviceId);
        this.removeDevice(deviceId);
      }
    }, 15000); // 15 seconds
    
    this.pingIntervals.set(deviceId, interval);
  }

  /**
   * Get online devices list
   */
  getOnlineDevices(): string[] {
    return Array.from(this.deviceConnections.keys());
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    return this.deviceStatus.get(deviceId);
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId: string, status: Partial<DeviceStatus>): void {
    const currentStatus = this.deviceStatus.get(deviceId);
    if (currentStatus) {
      this.deviceStatus.set(deviceId, {
        ...currentStatus,
        ...status,
      });
    }
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(deviceId: string): boolean {
    const ws = this.deviceConnections.get(deviceId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection count statistics
   */
  getConnectionStats(): {
    devices: number;
    clients: number;
    onlineDevices: string[];
  } {
    return {
      devices: this.deviceConnections.size,
      clients: this.clientConnections.size,
      onlineDevices: this.getOnlineDevices(),
    };
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
export { ConnectionManager };
export default connectionManager;

