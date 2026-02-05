import { eventService } from './EventService';
import { commandService } from './CommandService';
import { deviceService } from './DeviceService';
import { brpWebhookService } from './BRPWebhookService';
import { businessUnitService } from './BusinessUnitService';
import { brpApiService } from './BRPApiService';
import { connectionManager } from '../managers/ConnectionManager';
import logger from '../config/winston';

/**
 * Initialize all services and wire event handlers
 * This should be called after all services are created but before server starts
 */
export const initializeServices = async (): Promise<void> => {
  try {
    logger.info('Initializing services...');

    // Setup event handlers in EventService
    // This will register handlers that route events to CommandService
    eventService.setupEventHandlers();

    // Set ConnectionManager in services (will be fully initialized in Phase 5)
    commandService.setConnectionManager(connectionManager);
    deviceService.setConnectionManager(connectionManager);

    // Register BRP webhooks with external API
    await brpWebhookService.registerWebhooks();

    // Initialize BRP API authentication (optional - won't fail if not configured)
    try {
      if (brpApiService.isConfigured()) {
        await brpApiService.login();
        logger.info('BRP API authentication successful');
      } else {
        logger.debug('BRP API not configured - skipping authentication');
      }
    } catch (error) {
      // Log warning but don't fail server startup if BRP API is not configured
      logger.warn('BRP API authentication failed (optional feature)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Initialize business units cache
    await businessUnitService.initialize();

    logger.info('Services initialized successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error initializing services', { error: errorMessage });
    throw error;
  }
};

