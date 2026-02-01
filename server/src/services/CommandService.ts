import { Command, CommandType, CommandStatus, ICommandDocument, Device } from '../models';
import logger from '../config/winston';
import type { ConnectionManager } from '../managers/ConnectionManager';
import { ContextBuilder } from 'express-validator/lib/context-builder';

// Server command message format (matches protocol documentation)
export interface ServerCommand {
  MessageId: number;  
  Action: 'print' | 'dailyReport' | 'report' | 'customcmd';
  Seq?: string; // Receipt sequence number (for print)
  Text?: string; // Receipt text (for print)
  Price?: number; // Receipt amount (for print) - always sent as number
  StartDate?: string; // DDMMYY format (for report)
  EndDate?: string; // DDMMYY format (for report)
  CommandId?: string; // Custom command ID (for customcmd)
  Data?: string; // Custom command data (for customcmd)
}

/**
 * CommandService - Manages command queue and processing
 */
class CommandService {
  // Store connection manager reference (will be set in Phase 5)
  private connectionManager: ConnectionManager | null = null;

  /**
   * Set connection manager (called from Phase 5)
   */
  setConnectionManager(connectionManager: ConnectionManager): void {
    this.connectionManager = connectionManager;
  }

  /**
   * Create receipt command from event data
   * Validates for duplicates and creates command document
   */
  async createReceiptCommand(data: {
    device: string;
    amount: number;
    membershipFee: number;
    user: string;
    location: string;
    ip: string;
  }): Promise<ICommandDocument> {
    // Validate input
    if (!data.user || data.user.length < 2 || data.membershipFee <= 0) {
      throw new Error('Invalid receipt data: user must be at least 2 characters and membershipFee must be > 0');
    }

    // Check for duplicate (same user, same device)
    const lastCommand = await Command.getLastReceipt(data.device);
    
    if (lastCommand && lastCommand.userNumber === data.user) {
      logger.info('Duplicate receipt for same user', {
        device: data.device,
        user: data.user,
        lastCommandId: lastCommand._id,
      });
      throw new Error('Duplicate receipt for same user');
    }

    // Create new command
    const command = new Command({
      commandType: CommandType.RECEIPT,
      deviceId: data.device,
      amount: data.amount.toString(),
      membershipFee: data.membershipFee.toString(),
      userNumber: data.user,
      location: data.location,
      status: CommandStatus.PENDING,
      webhookRequestIp: data.ip,
    });

    await command.save();

    logger.info('Receipt command created', {
      commandId: command._id,
      device: data.device,
      user: data.user,
    });

    // Trigger processing
    await this.processPendingCommands(data.device);

    return command;
  }

  /**
   * Create daily report command
   */
  async createDailyReportCommand(deviceId: string, adminId?: string): Promise<ICommandDocument> {
    const command = new Command({
      commandType: CommandType.DAILY_REPORT,
      deviceId,
      status: CommandStatus.PENDING,
      adminId,
    });

    await command.save();

    logger.info('Daily report command created', {
      commandId: command._id,
      device: deviceId,
    });

    await this.processPendingCommands(deviceId);

    return command;
  }

  /**
   * Create period report command
   */
  async createPeriodReportCommand(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    adminId?: string
  ): Promise<ICommandDocument> {
    const command = new Command({
      commandType: CommandType.MONTHLY_REPORT,
      deviceId,
      startDate,
      endDate,
      status: CommandStatus.PENDING,
      adminId,
    });

    await command.save();

    logger.info('Period report command created', {
      commandId: command._id,
      device: deviceId,
      startDate,
      endDate,
    });

    await this.processPendingCommands(deviceId);

    return command;
  }

  /**
   * Create custom command
   */
  async createCustomCommand(
    deviceId: string,
    commandId: string,
    data?: string,
    adminId?: string
  ): Promise<ICommandDocument> {
    const command = new Command({
      commandType: CommandType.CUSTOM_CMD,
      deviceId,
      customCmdId: commandId,
      dataCmd: data,
      status: CommandStatus.PENDING,
      adminId,
    });

    await command.save();

    logger.info('Custom command created', {
      commandId: command._id,
      device: deviceId,
      customCmdId: commandId,
    });

    await this.processPendingCommands(deviceId);

    return command;
  }

  /**
   * Format command message for device (matches protocol documentation)
   */
  private async formatCommandMessage(command: ICommandDocument): Promise<ServerCommand> {
    const devidePin = await Device.findOne({ deviceId: command.deviceId }).select('devicePin').exec();
    let pin = devidePin?.devicePin ||'';
    const operator = 'ROBO';
    const clubReceiptN = await Command.countDocuments({ 
      deviceId: command.deviceId, 
      commandType: CommandType.RECEIPT,
      status: CommandStatus.COMPLETE 
    });
    Command.findByIdAndUpdate(command._id, { clubReceiptN: clubReceiptN.toString() });
    const sequenceNumber = clubReceiptN.toString().padStart(7, '0');
    switch (command.commandType) {
      case CommandType.RECEIPT:
        return {
          MessageId: command._id,
          Seq:  `${pin}-${operator}-${sequenceNumber}`,
          Action: 'print',
          Text: 'Ползване на фитнес и спа',
          Price: parseFloat(command.amount || '0'),
        };

      case CommandType.DAILY_REPORT:
        return {
          MessageId: command._id,
          Action: 'dailyReport',
        };

      case CommandType.MONTHLY_REPORT:
        if (!command.startDate || !command.endDate) {
          throw new Error('Start date and end date required for period report');
        }
        return {
          MessageId: command._id,
          Action: 'report',
          StartDate: this.formatDate(command.startDate),
          EndDate: this.formatDate(command.endDate),
        };

      case CommandType.CUSTOM_CMD:
        return {
          Action: 'customcmd',
          MessageId: command._id,
          CommandId: command.customCmdId || '',
          Data: command.dataCmd,
        };

      default:
        throw new Error(`Unknown command type: ${command.commandType}`);
    }
  }

  /**
   * Format date to DDMMYY format
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}${month}${year}`;
  }

  /**
   * Process pending commands for a device
   * Gets next pending command and sends to device via connection manager
   */
  async processPendingCommands(deviceId: string): Promise<void> {
    const pendingCommand = await Command.getPending(deviceId);

    if (!pendingCommand) {
      logger.debug('No pending commands for device', { device: deviceId });
      return;
    }

    // Format command message
    let commandMessage: ServerCommand;
    try {
      commandMessage = await this.formatCommandMessage(pendingCommand);
    } catch (error) {
      logger.error('Error formatting command message', {
        commandId: pendingCommand._id,
        device: deviceId,
        error,
      });
      // Mark command as error
      await Command.changeStatus(pendingCommand._id, true);
      return;
    }

    // Send to device via connection manager (if available)
    if (this.connectionManager) {
      const sent = this.connectionManager.sendToDevice(deviceId, commandMessage);
      
      if (!sent) {
        logger.warn('Device offline, command queued', {
          commandId: pendingCommand._id,
          device: deviceId,
        });
        // Command remains pending, will be processed when device reconnects
      } else {
        logger.info('Command sent to device', {
          commandId: pendingCommand._id,
          device: deviceId,
          action: commandMessage.Action,
        });
        
        // Update device status to processing
        this.connectionManager.updateDeviceStatus(deviceId, {
          status: 'processing',
        });
      }
    } else {
      logger.warn('Connection manager not available, command queued', {
        commandId: pendingCommand._id,
        device: deviceId,
      });
      // Connection manager will be set in Phase 5
    }
  }

  /**
   * Update command status from device response
   */
  async updateCommandStatus(
    messageId: number,
    isError: boolean = false
  ): Promise<ICommandDocument | null> {
    const command = await Command.changeStatus(messageId, isError);

    if (!command) {
      logger.warn('Command not found for status update', { messageId });
      return null;
    }

    logger.info('Command status updated', {
      commandId: messageId,
      status: command.status,
      device: command.deviceId,
    });

    // Process next pending command for device
    await this.processPendingCommands(command.deviceId);

    return command;
  }

  /**
   * Get pending command count for a device
   */
  async getPendingCount(deviceId: string): Promise<number> {
    return Command.countDocuments({
      deviceId,
      status: CommandStatus.PENDING,
    }).exec();
  }

  /**
   * Get pending commands count for a device (alias for getPendingCount)
   */
  async getPendingCommandsCount(deviceId: string): Promise<number> {
    return this.getPendingCount(deviceId);
  }

  /**
   * Get last command for a device
   */
  async getLastCommand(deviceId: string): Promise<ICommandDocument | null> {
    return Command.findOne({ deviceId })
      .sort({ ts: -1 })
      .exec();
  }

  /**
   * Get command by ID
   */
  async getCommandById(commandId: string): Promise<ICommandDocument | null> {
    return Command.findById(commandId).exec();
  }

  /**
   * Get command statistics
   */
  async getCommandStatistics(): Promise<{
    pending: number;
    processing: number;
    completed: number;
  }> {
    const [pending, completed, error] = await Promise.all([
      Command.countDocuments({ status: CommandStatus.PENDING }).exec(),
      Command.countDocuments({ status: CommandStatus.COMPLETE }).exec(),
      Command.countDocuments({ status: CommandStatus.ERROR }).exec(),
    ]);

    return {
      pending,
      processing: 0, // Commands are processed immediately, no "processing" state
      completed: completed + error, // Count both complete and error as "completed"
    };
  }
}

// Export singleton instance
export const commandService = new CommandService();
export { CommandService };
export default commandService;

