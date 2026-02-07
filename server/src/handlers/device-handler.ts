import http from 'http';
import { WebSocket } from 'ws';
import { connectionManager } from '../managers/ConnectionManager';
import { commandService } from '../services/CommandService';
import { deviceService } from '../services/DeviceService';
import { Device } from '../models';
import logger from '../config/winston';

// Device message types (from protocol documentation)
interface DeviceMessage {
  MessageId?: number;
  Action?: 'ping' | 'spad-naprejenie';
  Status?: 'success' | 'error' | 'noPapper' | 'spad-naprejenie';
  MsgData?: string;
  MsgStatus?: string;
}

/**
 * Setup device WebSocket handler
 * Handles connections to /ws/:deviceId
 * Uses express-ws pattern: app.ws('/ws/:deviceId', handler)
 */
export const setupDeviceHandler = (app: any, server: http.Server): void => {
  // express-ws is already initialized in server.ts
  // Just set up the route handler
  logger.info('Registering device WebSocket handler at /ws/:deviceId', {
    hasAppWs: typeof app.ws === 'function',
    appType: app.constructor?.name || typeof app,
  });
  
  if (typeof app.ws !== 'function') {
    logger.error('app.ws is not a function! express-ws may not be initialized correctly.');
    throw new Error('app.ws is not available. express-ws must be initialized before setting up handlers.');
  }
  
  try {
    app.ws('/ws/:deviceId', (ws: WebSocket, req: any) => {
    logger.info('Device connection attempt', {
      path: req.path,
      url: req.url,
      params: req.params,
      deviceId: req.params.deviceId,
      headers: req.headers,
      method: req.method,
    });
    
    const deviceId = req.params.deviceId;
    
    if (!deviceId) {
      logger.error('Device ID missing from request', {
        path: req.path,
        url: req.url,
        params: req.params,
      });
      ws.close(1008, 'Device ID required');
      return;
    }
    
    // Handle connection asynchronously
    (async () => {
      try {
        // Validate device exists in database
        const device = await Device.findOne({ deviceId }).exec();
      
        if (!device) {
          logger.warn('Device not found in database', { deviceId });
          ws.close(1008, 'Invalid device ID');
          return;
        }
        
        // Register device connection
        connectionManager.registerDevice(deviceId, ws);
        
        // Update device service
        await deviceService.updateDeviceStatus(deviceId, {
          status: true,
          lastSeen: new Date(),
        });
        
        // Process pending and error commands after a short delay (allow connection to stabilize)
        setTimeout(async () => {
          try {
            await commandService.processPendingCommands(deviceId);
          } catch (error) {
            logger.error('Error processing pending commands on connect', {
              deviceId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }, 1000);
        
        // Handle device messages
        ws.on('message', async (data: Buffer) => {
          await handleDeviceMessage(deviceId, data.toString(), ws);
        });
        
        // Handle device disconnect
        ws.on('close', (code: number, reason: Buffer) => {
          logger.info('Device disconnected', {
            deviceId,
            code,
            reason: reason.toString(),
          });
          
          connectionManager.removeDevice(deviceId);
          
          deviceService.updateDeviceStatus(deviceId, {
            status: false,
            lastSeen: new Date(),
          }).catch((error) => {
            logger.error('Error updating device status on disconnect', {
              deviceId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        });
        
        // Handle errors
        ws.on('error', (error: Error) => {
          logger.error('Device socket error', {
            deviceId,
            error: error.message,
          });
        });
        
      } catch (error) {
        logger.error('Error setting up device connection', {
          deviceId,
          error: error instanceof Error ? error.message : String(error),
        });
        ws.close(1011, 'Server error');
      }
    })();
  });
  
  logger.info('Device WebSocket handler initialized at /ws/:deviceId');
  } catch (error) {
    logger.error('Failed to register device WebSocket handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Handle message from device
 */
async function handleDeviceMessage(
  deviceId: string,
  data: string,
  ws: WebSocket
): Promise<void> {
  let message: DeviceMessage;
  
  try {
    // Parse message (data is already a string)
    message = JSON.parse(data);
  } catch (error) {
    logger.error('Invalid JSON from device', {
      deviceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  
  // Handle ping (no action needed, connection is pong)
  if (message.Action === 'ping') {
    connectionManager.updateDeviceStatus(deviceId, {
      lastSeen: new Date(),
    });
    return;
  }
  
  // Handle spad-naprejenie (voltage drop) event
  if (message.Action === 'spad-naprejenie' || message.Status === 'spad-naprejenie') {
    // Broadcast voltage drop alert to clients
    await handleSpadNaprejenie(deviceId);
    connectionManager.updateDeviceStatus(deviceId, {
      lastSeen: new Date(),
    });
    return;
  }
  console.log('message.Status', message.Status);
  // Handle status responses
  if (message.Status) {
    if (message.Status === 'noPapper') {
      // Broadcast no paper alert to clients
      await handleNoPaper(deviceId);
      connectionManager.updateDeviceStatus(deviceId, {
        status: 'noPapper',
        lastSeen: new Date(),
      });
      return;
    }
    
    // Handle command status responses (success or error)
    if (message.MessageId) {
      const isError = message.Status === 'error';
      
      try {
      await commandService.updateCommandStatus(message.MessageId, isError);
        
        if (isError) {
          logger.error('Command error from device', {
            deviceId,
            messageId: message.MessageId,
            msgData: message.MsgData,
            msgStatus: message.MsgStatus,
          });
        } else {
          logger.info('Command success from device', {
            deviceId,
            messageId: message.MessageId,
          });
        }
        
        // Update device status
        connectionManager.updateDeviceStatus(deviceId, {
          status: 'ready',
          lastSeen: new Date(),
        });
      } catch (error) {
        logger.error('Error processing device status response', {
          deviceId,
          messageId: message.MessageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

/**
 * Handle no paper alert from device
 */
async function handleNoPaper(deviceId: string): Promise<void> {
  try {
    const device = await Device.findOne({ deviceId }).exec();
    if (device) {
      connectionManager.broadcastToClients({
        type: 'noPapper',
        location: {
          name: device.name || device.location || deviceId,
          device: device.location,
          status: true, // Device still online
        },
      });
      
      logger.warn('No paper alert from device', {
        deviceId,
        location: device.name || device.location,
      });
    }
  } catch (error) {
    logger.error('Error fetching device for no paper broadcast', {
      deviceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle spad-naprejenie (voltage drop) alert from device
 */
async function handleSpadNaprejenie(deviceId: string): Promise<void> {
  try {
    const device = await Device.findOne({ deviceId }).exec();
    
    if (device) {
      connectionManager.broadcastToClients({
        type: 'spad-naprejenie',
        location: {
          name: device.name || device.location || deviceId,
          device: deviceId,
          status: true, // Device still online
        },
      });
      
      logger.warn('Voltage drop (spad-naprejenie) alert from device', {
        deviceId,
        location: device.name || device.location,
      });
    }
  } catch (error) {
    logger.error('Error fetching device for spad-naprejenie broadcast', {
      deviceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

