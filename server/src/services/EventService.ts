import { EventEmitter } from 'events';
import logger from '../config/winston';
import { commandService } from './CommandService';
import { connectionManager } from '../managers/ConnectionManager';

// Event data interfaces
export interface ReceiptEventData {
  club: string;
  zone?: string;
  membershipFee: number;
  user: string;
  device: string;
  ip: string;
  amount: number;
  location: string;
}

export interface DailyReportEventData {
  device: string;
}

export interface PeriodReportEventData {
  device: string;
  startDate: Date;
  endDate: Date;
}

export interface CustomCommandEventData {
  device: string;
  commandId: string;
  data?: string;
}

// Event types
export enum EventType {
  RECEIPT = 'receipt',
  DAILY_REPORT = 'daily',
  PERIOD_REPORT = 'period',
  CUSTOM_COMMAND = 'customCmd',
}

/**
 * EventService - Centralized event emission and handling
 * Extends EventEmitter to provide typed event system
 */
class EventService extends EventEmitter {
  private handlersSetup: boolean = false;

  constructor() {
    super();
    this.setMaxListeners(50); // Allow up to 50 listeners per event
    logger.info('EventService initialized');
    // Note: setupEventHandlers() is called from initializeServices()
    // after all services are initialized to avoid duplicate handler registration
  }

  /**
   * Emit receipt event
   */
  emitReceipt(data: ReceiptEventData): void {
    logger.debug('Emitting receipt event', { device: data.device, user: data.user });
    this.emit(EventType.RECEIPT, data);
  }

  /**
   * Emit daily report event
   */
  emitDailyReport(data: DailyReportEventData): void {
    logger.debug('Emitting daily report event', { device: data.device });
    this.emit(EventType.DAILY_REPORT, data);
  }

  /**
   * Emit period report event
   */
  emitPeriodReport(data: PeriodReportEventData): void {
    logger.debug('Emitting period report event', {
      device: data.device,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    this.emit(EventType.PERIOD_REPORT, data);
  }

  /**
   * Emit custom command event
   */
  emitCustomCommand(data: CustomCommandEventData): void {
    logger.debug('Emitting custom command event', {
      device: data.device,
      commandId: data.commandId,
    });
    this.emit(EventType.CUSTOM_COMMAND, data);
  }

  /**
   * Get event listener count for debugging
   */
  getListenerCount(eventType: EventType): number {
    return this.listenerCount(eventType);
  }

  /**
   * Setup event handlers to route events to appropriate services
   * This method is called after all services are initialized
   */
  setupEventHandlers(): void {
    // Prevent duplicate handler registration
    if (this.handlersSetup) {
      logger.warn('Event handlers already setup, skipping duplicate registration');
      return;
    }

    // Remove any existing listeners to ensure clean state
    this.removeAllListeners(EventType.RECEIPT);
    this.removeAllListeners(EventType.DAILY_REPORT);
    this.removeAllListeners(EventType.PERIOD_REPORT);
    this.removeAllListeners(EventType.CUSTOM_COMMAND);

    // Receipt event handler
    this.on(EventType.RECEIPT, async (data: ReceiptEventData) => {
      try {
        const command = await commandService.createReceiptCommand({
          device: data.device,
          amount: data.amount,
          membershipFee: data.membershipFee,
          user: data.user,
          location: data.location,
          ip: data.ip,
        });

        logger.info('Receipt command created from event', {
          commandId: command._id,
          device: data.device,
          user: data.user,
        });

        // Broadcast receipt event to clients (matches protocol - no type wrapper)
        connectionManager.broadcastToClients({
          MessageId: command._id.toString(),
          UnicSaleNum: command.clubReceiptN?.toString() || '0',
          action: 'print',
          price: command.amount || '0',
          user: command.userNumber || '',
          location: command.location || '',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'Duplicate receipt for same user') {
          logger.info('Duplicate receipt ignored', {
            device: data.device,
            user: data.user,
          });
        } else {
          logger.error('Error processing receipt event', {
            error: errorMessage,
            device: data.device,
            user: data.user,
          });
        }
      }
    });

    // Daily report event handler
    this.on(EventType.DAILY_REPORT, async (data: DailyReportEventData) => {
      try {
        const command = await commandService.createDailyReportCommand(data.device);
        logger.info('Daily report command created from event', {
          commandId: command._id,
          device: data.device,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error processing daily report event', {
          error: errorMessage,
          device: data.device,
        });
      }
    });

    // Period report event handler
    this.on(EventType.PERIOD_REPORT, async (data: PeriodReportEventData) => {
      try {
        const command = await commandService.createPeriodReportCommand(
          data.device,
          data.startDate,
          data.endDate
        );
        logger.info('Period report command created from event', {
          commandId: command._id,
          device: data.device,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error processing period report event', {
          error: errorMessage,
          device: data.device,
        });
      }
    });

    // Custom command event handler
    this.on(EventType.CUSTOM_COMMAND, async (data: CustomCommandEventData) => {
      try {
        const command = await commandService.createCustomCommand(
          data.device,
          data.commandId,
          data.data
        );
        logger.info('Custom command created from event', {
          commandId: command._id,
          device: data.device,
          customCmdId: data.commandId,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error processing custom command event', {
          error: errorMessage,
          device: data.device,
        });
      }
    });

    this.handlersSetup = true;
    logger.info('Event handlers registered');
  }
}

// Export singleton instance
export const eventService = new EventService();
export { EventService };
export default eventService;

