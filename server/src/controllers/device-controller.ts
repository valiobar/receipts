import { Request, Response } from 'express';
import { deviceService } from '../services/DeviceService';
import { commandService } from '../services/CommandService';
import { connectionManager } from '../managers/ConnectionManager';
import { sendSuccess, sendError } from '../utils/api-response';
import { ICommandDocument } from '../models';
import logger from '../config/winston';

/**
 * GET /api/devices
 * Retrieve list of all devices with their status
 */
export const listDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const online = req.query.online === 'true' ? true : req.query.online === 'false' ? false : undefined;
    const location = req.query.location as string | undefined;
    
    const devices = await deviceService.getAllDevices({ online, location });
    
    // Calculate summary
    const summary = {
      total: devices.length,
      online: devices.filter(d => d.online).length,
      offline: devices.filter(d => !d.online).length,
    };
    
    sendSuccess(req, res, {
      devices,
      summary,
    });
  } catch (error) {
    logger.error('List devices error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/devices/:id
 * Retrieve a specific device by ID
 */
export const getDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const device = await deviceService.getDeviceById(id);
    
    if (!device) {
      sendError(req, res, 'NOT_FOUND', 'Device not found', 404);
      return;
    }
    
    sendSuccess(req, res, { device });
  } catch (error) {
    logger.error('Get device error', {
      error: error instanceof Error ? error.message : String(error),
      deviceId: req.params.id,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/devices/:id/status
 * Get real-time status of a device
 */
export const getDeviceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get device from database
    const device = await deviceService.getDeviceById(id);
    
    if (!device) {
      sendError(req, res, 'NOT_FOUND', 'Device not found', 404);
      return;
    }
    
    // Get real-time status from ConnectionManager
    const deviceStatus = connectionManager.getDeviceStatus(id);
    const isOnline = connectionManager.isDeviceOnline(id);
    
    // Get pending commands count
    const pendingCommands = await commandService.getPendingCommandsCount(id);
    
    // Get last command
    const lastCommand = await commandService.getLastCommand(id);
    
    sendSuccess(req, res, {
      deviceId: id,
      online: isOnline,
      lastSeen: deviceStatus?.lastSeen || device.lastSeen,
      status: deviceStatus?.status || 'ready',
      pendingCommands,
      lastCommand: lastCommand ? {
        id: lastCommand._id.toString(),
        type: lastCommand.commandType,
        status: lastCommand.status,
        timestamp: lastCommand.ts.toISOString(),
      } : undefined,
    });
  } catch (error) {
    logger.error('Get device status error', {
      error: error instanceof Error ? error.message : String(error),
      deviceId: req.params.id,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * POST /api/devices/:id/command
 * Send a command to a device
 */
export const sendCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, startDate, endDate, commandId, data } = req.body;
    
    // Validate device exists
    const device = await deviceService.getDeviceById(id);
    
    if (!device) {
      sendError(req, res, 'NOT_FOUND', 'Device not found', 404);
      return;
    }
    
    // Helper function to parse date from DD-MM-YYYY or ISO format
    const parseDate = (dateStr: string): Date | null => {
      try {
        // Try ISO format first
        const isoDate = new Date(dateStr);
        if (!isNaN(isoDate.getTime())) {
          return isoDate;
        }
        
        // Try DD-MM-YYYY format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(parts[2], 10);
          
          // Handle 2-digit year (assume 20XX)
          const fullYear = year < 100 ? 2000 + year : year;
          
          const date = new Date(fullYear, month, day);
          
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        return null;
      } catch {
        return null;
      }
    };
    
    // Validate command type - all report types supported via client API
    const validTypes = ['daily', 'period', 'cmd', 'daily-X', 'spad-naprejenie'];
    if (!type || !validTypes.includes(type)) {
      sendError(
        req,
        res,
        'VALIDATION_ERROR',
        'Invalid command type',
        400,
        {
          type: `Must be one of: ${validTypes.join(', ')}`,
        }
      );
      return;
    }
    
    let command: ICommandDocument | undefined;
    
    // Create command based on type - all report types triggered by client
    switch (type) {
      case 'daily':
      case 'daily-X':
        command = await commandService.createDailyReportCommand(id, req.user?.id);
        break;
        
      case 'period':
        if (!startDate || !endDate) {
          sendError(
            req,
            res,
            'VALIDATION_ERROR',
            'Start date and end date are required for period report',
            400,
            {
              startDate: startDate ? undefined : 'Start date is required',
              endDate: endDate ? undefined : 'End date is required',
            }
          );
          return;
        }
        // Parse dates (format: DD-MM-YYYY or ISO format)
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        
        if (!start || !end) {
          sendError(
            req,
            res,
            'VALIDATION_ERROR',
            'Invalid date format. Use DD-MM-YYYY or ISO format',
            400,
            {
              startDate: 'Invalid date format',
              endDate: 'Invalid date format',
            }
          );
          return;
        }
        
        command = await commandService.createPeriodReportCommand(
          id,
          start,
          end,
          req.user?.id
        );
        break;
        
      case 'cmd':
        // Custom command (requires additional parameters)
        if (!commandId || !data) {
          sendError(
            req,
            res,
            'VALIDATION_ERROR',
            'Command ID and data are required for custom command',
            400,
            {
              commandId: commandId ? undefined : 'Command ID is required',
              data: data ? undefined : 'Data is required',
            }
          );
          return;
        }
        command = await commandService.createCustomCommand(
          id,
          commandId,
          data,
          req.user?.id
        );
        break;
        
      case 'spad-naprejenie':
        // Special command type - log and create custom command if needed
        logger.info('Spad naprejenie command received from client', { deviceId: id });
        // For now, treat as custom command - may need specific implementation
        if (!commandId || !data) {
          sendError(
            req,
            res,
            'VALIDATION_ERROR',
            'Command ID and data are required for spad-naprejenie command',
            400,
            {
              commandId: commandId ? undefined : 'Command ID is required',
              data: data ? undefined : 'Data is required',
            }
          );
          return;
        }
        command = await commandService.createCustomCommand(
          id,
          commandId,
          data,
          req.user?.id
        );
        break;
    }
    
    // Ensure command was created (TypeScript safety check)
    if (!command) {
      sendError(req, res, 'INTERNAL_ERROR', 'Failed to create command', 500);
      return;
    }
    
    // Check if device is online
    const isOnline = connectionManager.isDeviceOnline(id);
    
    if (!isOnline) {
      // Command is queued, return success with warning
      sendSuccess(req, res, {
        commandId: command._id.toString(),
        deviceId: id,
        type,
        status: 'pending',
        createdAt: command.ts.toISOString(),
        message: 'Device is not connected. Command will be queued.',
      });
      return;
    }
    
    // Process command immediately
    await commandService.processPendingCommands(id);
    
    sendSuccess(req, res, {
      commandId: command._id.toString(),
      deviceId: id,
      type,
      status: 'pending',
      createdAt: command.ts.toISOString(),
    });
  } catch (error) {
    logger.error('Send command error', {
      error: error instanceof Error ? error.message : String(error),
      deviceId: req.params.id,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

