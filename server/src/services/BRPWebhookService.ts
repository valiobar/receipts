import logger from '../config/winston';
import { env } from '../utils/env';
import { BRPEventType, RECEIPT_TRIGGER_EVENTS } from '../types/brp-events';

/**
 * BRP Webhook Registration Service
 * Handles registration of webhooks with BRP Event API
 */
class BRPWebhookService {
  private brpApiUrl?: string;
  private brpApiKey?: string;
  private webhookUrl?: string;
  private webhookSecret?: string;
  private registered: boolean = false;

  constructor() {
    this.brpApiUrl = process.env.BRP_API_URL;
    this.brpApiKey = process.env.BRP_API_KEY;
    this.webhookUrl = process.env.BRP_WEBHOOK_URL;
    this.webhookSecret = process.env.BRP_WEBHOOK_SECRET;
  }

  /**
   * Register webhooks with BRP Event API
   * Registers webhooks for all receipt-triggering events
   */
  async registerWebhooks(): Promise<void> {
    // Skip registration if not configured
    if (!this.brpApiUrl || !this.webhookUrl) {
      logger.info('BRP webhook registration skipped - not configured', {
        hasApiUrl: !!this.brpApiUrl,
        hasWebhookUrl: !!this.webhookUrl,
      });
      return;
    }

    if (this.registered) {
      logger.debug('BRP webhooks already registered');
      return;
    }

    try {
      logger.info('Registering BRP webhooks...', {
        apiUrl: this.brpApiUrl,
        webhookUrl: this.webhookUrl,
        events: RECEIPT_TRIGGER_EVENTS,
      });

      // Register webhook for each receipt-triggering event
      const registrations = await Promise.allSettled(
        RECEIPT_TRIGGER_EVENTS.map((event) => this.registerWebhook(event))
      );

      // Log results
      const successful = registrations.filter((r) => r.status === 'fulfilled').length;
      const failed = registrations.filter((r) => r.status === 'rejected').length;

      logger.info('BRP webhook registration completed', {
        successful,
        failed,
        total: RECEIPT_TRIGGER_EVENTS.length,
      });

      // Log any failures
      registrations.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Failed to register BRP webhook', {
            event: RECEIPT_TRIGGER_EVENTS[index],
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      });

      this.registered = true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error during BRP webhook registration', {
        error: errorMessage,
      });
      // Don't throw - allow server to start even if registration fails
    }
  }

  /**
   * Register a single webhook for a specific event
   */
  private async registerWebhook(event: BRPEventType): Promise<void> {
    if (!this.brpApiUrl || !this.webhookUrl) {
      throw new Error('BRP API URL or webhook URL not configured');
    }

    // Data projection - select fields we need for receipt processing
    // Based on BRP API documentation, this is a GraphQL query string
    const dataProjection = this.getDataProjection(event);

    // Optional data filter - can be null
    const dataFilter = null;

    const payload = {
      url: this.webhookUrl,
      licenseId:"4754baa736f74fc1bb78734ca38db928",
      event: event,
      data: dataProjection,
      dataFilter: dataFilter,
      secret: this.webhookSecret || undefined,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (this.brpApiKey) {
      headers['Authorization'] = `Bearer ${this.brpApiKey}`;
    }
    const fullUrl = `${this.brpApiUrl}/api/v1/webhook/4754baa736f74fc1bb78734ca38db928`;
 console.log('this.brpApiUrl', fullUrl);
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to register webhook: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json().catch(() => ({}))) as { id?: number };
    console.log('BRP webhook registered successfully', result);
    logger.debug('BRP webhook registered successfully', {
      event,
      webhookId: result.id,
    });
  }

  /**
   * Get data projection (GraphQL query string) for an event
   * Selects fields needed for receipt processing
   */
  private getDataProjection(event: BRPEventType): string {
    // Common fields for booking events
    const commonFields = '{ id, amount, timePoint, businessUnit { id, name, timeZone }, person { id, ssn, firstName, lastName, businessUnit { id, name } } }';

    // Return appropriate projection based on event type
    switch (event) {
      case BRPEventType.SUBSCRIPTION_BOOKING_DEBITED:
      case BRPEventType.ENTRY_BOOKING_DEBITED:
      case BRPEventType.EVENT_BOOKING_DEBITED:
      case BRPEventType.GROUP_ACTIVITY_BOOKING_DEBITED:
      case BRPEventType.ITEM_BOOKING_DEBITED:
      case BRPEventType.SERVICE_BOOKING_DEBITED:
      case BRPEventType.VALUE_CARD_BOOKING_DEBITED:
        return commonFields;
      default:
        // Fallback to minimal projection
        return '{ id, amount, businessUnit { id, name }, person { id, ssn } }';
    }
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(): Promise<unknown[]> {
    if (!this.brpApiUrl) {
      throw new Error('BRP API URL not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.brpApiKey) {
      headers['Authorization'] = `Bearer ${this.brpApiKey}`;
    }

    const response = await fetch(`${this.brpApiUrl}/api/v1/webhook`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list webhooks: ${response.status} ${response.statusText}`);
    }

    const webhooks = await response.json();
    return Array.isArray(webhooks) ? webhooks : [];
  }
}

// Export singleton instance
export const brpWebhookService = new BRPWebhookService();
export { BRPWebhookService };
export default brpWebhookService;

