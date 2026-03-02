import { BRPUser } from '../models/BRPUser';
import { brpApiService } from './BRPApiService';
import logger from '../config/winston';
import type { BRPSubscription, BRPCustomer } from '../types/brp-api';

const extractAmountFromSubscriptionName = (name: string): number | null => {
  const match = /(\d+)EUR/i.exec(name);
  return match ? Number.parseInt(match[1], 10) : null;
};

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

        // Extract initial amount from subscription product name (e.g. 990 from "990EUR")
        const extractedAmount = extractAmountFromSubscriptionName(subscription.subscriptionProduct.name);
        if (extractedAmount === null) {
          logger.warn('Could not extract EUR amount from subscription name, skipping user creation', {
            personId,
            subscriptionName: subscription.subscriptionProduct.name,
          });
          return;
        }
        const initialAmount = extractedAmount;

        // Extract subscription start date
        const subscriptionStartDate = subscription.start ? new Date(subscription.start) : undefined;

        // Create new BRP user
        await BRPUser.create({
          brpId: personId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          customerNumber: customer.customerNumber,
          amount: initialAmount - 1,
          initialAmount: initialAmount,
          subscriptionStartDate,
        });

        logger.info('New BRP user created with Pulse Club amount', {
          personId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          customerNumber: customer.customerNumber,
          initialAmount,
          subscriptionName: subscription.subscriptionProduct.name,
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

  async backfillInitialAmounts(): Promise<void> {
    logger.info('Starting backfill of BRPUser initial amounts from subscription names');

    const users = await BRPUser.find({});
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const subscriptions = await brpApiService.getCustomerSubscriptions(user.brpId);

        const subscription = subscriptions.find((sub: BRPSubscription) =>
          sub.subscriptionProduct.name.toLowerCase().includes('pulse club')
        );

        if (!subscription) {
          logger.warn('Backfill: No Pulse Club subscription found, skipping', {
            brpId: user.brpId,
            customerNumber: user.customerNumber,
          });
          skipped++;
          continue;
        }

        const extractedAmount = extractAmountFromSubscriptionName(subscription.subscriptionProduct.name);

        if (extractedAmount === null) {
          logger.warn('Backfill: Could not extract EUR amount from subscription name, skipping', {
            brpId: user.brpId,
            subscriptionName: subscription.subscriptionProduct.name,
          });
          skipped++;
          continue;
        }

        const usedAmount = Math.max(1, user.initialAmount - user.amount);
        const newAmount = Math.max(0, extractedAmount - usedAmount);

        await BRPUser.findOneAndUpdate(
          { brpId: user.brpId },
          { $set: { initialAmount: extractedAmount, amount: newAmount } }
        );

        logger.info('Backfill: Updated BRP user amounts', {
          brpId: user.brpId,
          customerNumber: user.customerNumber,
          oldInitialAmount: user.initialAmount,
          oldAmount: user.amount,
          usedAmount,
          newInitialAmount: extractedAmount,
          newAmount,
          subscriptionName: subscription.subscriptionProduct.name,
        });

        updated++;
      } catch (error) {
        logger.error('Backfill: Error processing user', {
          brpId: user.brpId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        failed++;
      }
    }

    logger.info('Backfill complete', {
      total: users.length,
      updated,
      skipped,
      failed,
    });
  }
}

// Export singleton instance
export const brpUserService = new BRPUserService();
export { BRPUserService };
export default brpUserService;

