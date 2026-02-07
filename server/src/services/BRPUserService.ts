import { BRPUser } from '../models/BRPUser';
import { brpApiService } from './BRPApiService';
import logger from '../config/winston';
import type { BRPSubscription, BRPCustomer } from '../types/brp-api';

/**
 * BRPUserService - Manages BRP user amount operations
 * Handles Pulse Club subscription amount management
 */
class BRPUserService {
  /**
   * Process Pulse Club amount for a person
   * Fetches subscriptions, finds "Pulse Club" subscription, and updates/creates BRP user
   * @param personId - BRP person ID
   * @param pulseClubSubscription - Optional Pulse Club subscription data (avoids duplicate API call if already fetched)
   */
  async processPulseClubAmount(
    personId: number,
    pulseClubSubscription?: BRPSubscription
  ): Promise<void> {
    try {
      // Check if BRP API is configured
      if (!brpApiService.isConfigured()) {
        logger.warn('BRP API not configured, skipping Pulse Club amount processing', {
          personId,
        });
        return;
      }

      let subscription: BRPSubscription | undefined = pulseClubSubscription;

      // If subscription not provided, fetch it
      if (!subscription) {
        logger.debug('Fetching customer subscriptions for Pulse Club check', { personId });
        const subscriptions = await brpApiService.getCustomerSubscriptions(personId);

        // Find subscription with "Pulse Club" in name (case-insensitive)
        subscription = subscriptions.find((sub: BRPSubscription) =>
          sub.subscriptionProduct.name.toLowerCase().includes('pulse club')
        );

        if (!subscription) {
          logger.debug('No Pulse Club subscription found', { personId });
          return;
        }
      }

      logger.debug('Pulse Club subscription found', {
        personId,
        subscriptionId: subscription.id,
        subscriptionName: subscription.subscriptionProduct.name,
        wasProvided: !!pulseClubSubscription,
      });

      // Check if BRP user exists by brpId
      const existingUser = await BRPUser.findOne({ brpId: personId });

      if (existingUser) {
        // User exists: Decrease amount by 1 (ensure it doesn't go below 0)
        const newAmount = Math.max(0, existingUser.amount - 1);
        
        // Update subscription start date if provided and not already set
        const updateData: any = { $set: { amount: newAmount } };
        if (subscription?.start && !existingUser.subscriptionStartDate) {
          updateData.$set.subscriptionStartDate = new Date(subscription.start);
        }
        
        await BRPUser.findOneAndUpdate(
          { brpId: personId },
          updateData,
          { new: true }
        );

        logger.info('BRP user amount decreased', {
          personId,
          previousAmount: existingUser.amount,
          newAmount,
        });
      } else {
        // User doesn't exist: Fetch customer info and create new BRP user
        logger.debug('BRP user not found, fetching customer info', { personId });
        const customer = await brpApiService.getCustomerById(personId);

        // Calculate initial amount: subscription price amount minus 1
        const subscriptionPriceAmount = subscription.price.amount / 200;
        const initialAmount = Math.max(0, subscriptionPriceAmount - 1);

        // Extract subscription start date
        const subscriptionStartDate = subscription.start ? new Date(subscription.start) : undefined;

        // Create new BRP user
        await BRPUser.create({
          brpId: personId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          customerNumber: customer.customerNumber,
          amount: initialAmount,
          initialAmount: initialAmount,
          subscriptionStartDate,
        });

        logger.info('New BRP user created with Pulse Club amount', {
          personId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          customerNumber: customer.customerNumber,
          initialAmount,
          subscriptionPriceAmount,
        });
      }
    } catch (error) {
      // Log errors but don't throw (webhook should still succeed)
      logger.error('Error processing Pulse Club amount', {
        personId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Get Pulse Club subscription for a person
   * Fetches subscriptions and returns the Pulse Club subscription if found
   * @param personId - BRP person ID
   * @returns Pulse Club subscription if found, null otherwise
   */
  async getPulseClubSubscription(personId: number): Promise<BRPSubscription | null> {
    try {
      // Check if BRP API is configured
      if (!brpApiService.isConfigured()) {
        logger.warn('BRP API not configured, cannot check Pulse Club subscription', {
          personId,
        });
        return null;
      }

      // Fetch customer subscriptions
      const subscriptions = await brpApiService.getCustomerSubscriptions(personId);

      // Find subscription with "Pulse Club" in name (case-insensitive)
      const pulseClubSubscription = subscriptions.find((subscription: BRPSubscription) =>
        subscription.subscriptionProduct.name.toLowerCase().includes('pulse club')
      );

      if (pulseClubSubscription) {
        logger.debug('Pulse Club subscription found', {
          personId,
          subscriptionId: pulseClubSubscription.id,
          subscriptionName: pulseClubSubscription.subscriptionProduct.name,
        });
        return pulseClubSubscription;
      }

      logger.debug('No Pulse Club subscription found', { personId });
      return null;
    } catch (error) {
      // Log errors but return null (don't throw)
      logger.error('Error fetching Pulse Club subscription', {
        personId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }
}

// Export singleton instance
export const brpUserService = new BRPUserService();
export { BRPUserService };
export default brpUserService;

