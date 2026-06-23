import { BRPUser } from '../models/BRPUser';
import { brpApiService } from './BRPApiService';
import logger from '../config/winston';
import type { BRPSubscription } from '../types/brp-api';
import type { IBRPLeftover, IBRPUser } from '../models/types';

const extractAmountFromSubscriptionName = (name: string): number | null => {
  const match = /(\d+)EUR/i.exec(name);
  return match ? Number.parseInt(match[1], 10) : null;
};

const isPulseClub = (sub: BRPSubscription): boolean =>
  sub.subscriptionProduct.name.toLowerCase().includes('pulse club');

// A subscription is active when it has started and has not yet expired.
// Expiry = end date, falling back to boundUntil when end is missing/empty.
const isSubscriptionActive = (sub: BRPSubscription, now: Date): boolean => {
  if (sub.start && new Date(sub.start) > now) return false; // not started yet (future plan)
  const expiryRaw = sub.end || sub.boundUntil;
  if (!expiryRaw) return true; // ongoing, no expiry
  return new Date(expiryRaw) >= now;
};

const findActivePulseClubSubscription = (
  subscriptions: BRPSubscription[],
  now: Date = new Date()
): BRPSubscription | undefined =>
  subscriptions.find((sub) => isPulseClub(sub) && isSubscriptionActive(sub, now));

// Renewal = we have a baseline, the prior period has expired, and the period advanced.
// Keeping this idempotent: once the new period is persisted, the same entry won't roll over again.
const detectRenewal = (
  existingUser: IBRPUser,
  newStart: Date | undefined,
  newBoundUntil: Date | undefined,
  now: Date
): boolean => {
  const storedStart = existingUser.subscriptionStartDate;
  const storedBoundUntil = existingUser.subscriptionBoundUntil;
  if (!storedBoundUntil || now <= storedBoundUntil) return false;
  return (
    (!!newStart && !!storedStart && newStart > storedStart) ||
    (!!newBoundUntil && newBoundUntil > storedBoundUntil)
  );
};

// Result of computing how an existing user's voucher amount changes on this entry.
interface AmountUpdate {
  newAmount: number;
  newInitialAmount: number;
  leftoverRecord?: IBRPLeftover;
  isRenewal: boolean;
}

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

        // Only accept a currently active Pulse Club subscription (skip during coverage gaps).
        subscription = findActivePulseClubSubscription(subscriptions);

        if (!subscription) {
          logger.debug('No active Pulse Club subscription found', { personId });
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
        await this.updateExistingUserAmount(existingUser, subscription, personId);
      } else {
        await this.createUserForSubscription(subscription, personId);
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
   * Compute the voucher amount change for an existing user on this entry.
   * On a renewal, captures the expired plan's unused vouchers as a per-plan leftover and
   * resets the spendable amount to the new cycle's grant; otherwise decrements by one.
   */
  private computeAmountUpdate(
    existingUser: IBRPUser,
    subscription: BRPSubscription,
    personId: number,
    now: Date
  ): AmountUpdate {
    const newStart = subscription.start ? new Date(subscription.start) : undefined;
    const newBoundUntil = subscription.boundUntil ? new Date(subscription.boundUntil) : undefined;
    const isRenewal = detectRenewal(existingUser, newStart, newBoundUntil, now);

    if (!isRenewal) {
      return {
        newAmount: Math.max(0, existingUser.amount - 1),
        newInitialAmount: existingUser.initialAmount,
        isRenewal: false,
      };
    }

    const extracted = extractAmountFromSubscriptionName(subscription.subscriptionProduct.name);
    if (extracted === null) {
      // Cannot derive the new grant -> fall back to a normal decrement (no rollover).
      logger.warn('Renewal detected but EUR amount not extractable; skipping rollover', {
        personId,
        subscriptionName: subscription.subscriptionProduct.name,
      });
      return {
        newAmount: Math.max(0, existingUser.amount - 1),
        newInitialAmount: existingUser.initialAmount,
        isRenewal: true,
      };
    }

    const newCycleAmount = Math.floor(extracted / 2);
    // Capture a per-plan leftover record for the EXPIRED plan (from stored identity).
    const leftoverRecord: IBRPLeftover = {
      subscriptionId: existingUser.subscriptionId,
      subscriptionName: existingUser.subscriptionName,
      start: existingUser.subscriptionStartDate,
      boundUntil: existingUser.subscriptionBoundUntil,
      amount: Math.max(0, existingUser.amount),
      recordedAt: now,
    };
    // Spendable amount = new grant only (leftover stored separately), consume this entry.
    return {
      newAmount: Math.max(0, newCycleAmount - 1),
      newInitialAmount: newCycleAmount,
      leftoverRecord,
      isRenewal: true,
    };
  }

  /**
   * Apply a renewal rollover or a normal decrement to an existing BRP user, and advance the
   * stored current-plan identity so a renewal rolls over exactly once.
   */
  private async updateExistingUserAmount(
    existingUser: IBRPUser,
    subscription: BRPSubscription,
    personId: number
  ): Promise<void> {
    const now = new Date();
    const newStart = subscription.start ? new Date(subscription.start) : undefined;
    const newBoundUntil = subscription.boundUntil ? new Date(subscription.boundUntil) : undefined;
    const { newAmount, newInitialAmount, leftoverRecord, isRenewal } = this.computeAmountUpdate(
      existingUser,
      subscription,
      personId,
      now
    );

    const set: Partial<{
      amount: number;
      initialAmount: number;
      subscriptionStartDate: Date;
      subscriptionBoundUntil: Date;
      subscriptionId: number;
      subscriptionName: string;
    }> = {
      amount: newAmount,
      initialAmount: newInitialAmount,
    };
    // Advance / backfill the current plan identity so renewals roll over exactly once.
    if (newStart) set.subscriptionStartDate = newStart;
    if (newBoundUntil) set.subscriptionBoundUntil = newBoundUntil;
    set.subscriptionId = subscription.id;
    set.subscriptionName = subscription.subscriptionProduct.name;

    await BRPUser.findOneAndUpdate(
      { brpId: personId },
      leftoverRecord ? { $set: set, $push: { leftovers: leftoverRecord } } : { $set: set },
      { new: true }
    );

    logger.info(
      isRenewal
        ? 'BRP subscription renewed: leftover stored, amount reset to new grant'
        : 'BRP user amount decreased',
      {
        personId,
        previousAmount: existingUser.amount,
        newAmount,
        newInitialAmount,
        leftoverStored: leftoverRecord?.amount,
        rolledOver: isRenewal,
      }
    );
  }

  /**
   * Create a new BRP user seeded from an active Pulse Club subscription.
   * Derives the initial grant from the product name and stores the current plan identity.
   */
  private async createUserForSubscription(
    subscription: BRPSubscription,
    personId: number
  ): Promise<void> {
    // User doesn't exist: Fetch customer info and create new BRP user
    logger.debug('BRP user not found, fetching customer info', { personId });

    // Extract initial amount from subscription product name (e.g. 990 from "990EUR")
    const extractedAmount = extractAmountFromSubscriptionName(subscription.subscriptionProduct.name);
    if (extractedAmount === null) {
      logger.warn('Could not extract EUR amount from subscription name, skipping user creation', {
        personId,
        subscriptionName: subscription.subscriptionProduct.name,
      });
      return;
    }

    const customer = await brpApiService.getCustomerById(personId);
    const initialAmount = Math.floor(extractedAmount / 2);
    const amount = Math.max(0, initialAmount - 1);

    // Extract subscription start date and boundUntil
    const subscriptionStartDate = subscription.start ? new Date(subscription.start) : undefined;
    const subscriptionBoundUntil = subscription.boundUntil
      ? new Date(subscription.boundUntil)
      : undefined;

    await BRPUser.create({
      brpId: personId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customerNumber: customer.customerNumber,
      amount,
      initialAmount,
      subscriptionStartDate,
      subscriptionBoundUntil,
      subscriptionId: subscription.id,
      subscriptionName: subscription.subscriptionProduct.name,
      leftovers: [],
    });

    logger.info('New BRP user created with Pulse Club amount', {
      personId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customerNumber: customer.customerNumber,
      amount,
      initialAmount,
      subscriptionName: subscription.subscriptionProduct.name,
    });
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

      // Only accept a currently active Pulse Club subscription (skip during coverage gaps).
      const pulseClubSubscription = findActivePulseClubSubscription(subscriptions);

      if (pulseClubSubscription) {
        logger.debug('Active Pulse Club subscription found', {
          personId,
          subscriptionId: pulseClubSubscription.id,
          subscriptionName: pulseClubSubscription.subscriptionProduct.name,
        });
        return pulseClubSubscription;
      }

      logger.debug('No active Pulse Club subscription found', { personId });
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

  async backfillHalvedInitialAmounts(): Promise<void> {
    logger.info('Starting BRPUser halve backfill migration (one-off)', {
      migration: 'HALVE_BRP_USER_AMOUNTS',
    });

    const users = await BRPUser.find({});
    let updated = 0;
    let failed = 0;

    logger.info('Loaded BRP users for halving migration', {
      migration: 'HALVE_BRP_USER_AMOUNTS',
      totalUsers: users.length,
    });

    for (const user of users) {
      try {
        const oldInitialAmount = user.initialAmount;
        const oldAmount = user.amount;
        const newInitialAmount = Math.floor(oldInitialAmount / 2);
        const newAmount = Math.max(0, oldAmount - newInitialAmount);

        await BRPUser.findOneAndUpdate(
          { brpId: user.brpId },
          { $set: { initialAmount: newInitialAmount, amount: newAmount } }
        );

        logger.info('Backfill (halve): Updated BRP user amounts', {
          migration: 'HALVE_BRP_USER_AMOUNTS',
          brpId: user.brpId,
          customerNumber: user.customerNumber,
          oldInitialAmount,
          newInitialAmount,
          oldAmount,
          newAmount,
        });

        updated++;
      } catch (error) {
        logger.error('Backfill (halve): Error processing BRP user', {
          migration: 'HALVE_BRP_USER_AMOUNTS',
          brpId: user.brpId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        failed++;
      }
    }

    logger.info('BRPUser halve backfill migration complete (one-off)', {
      migration: 'HALVE_BRP_USER_AMOUNTS',
      totalUsers: users.length,
      updated,
      failed,
    });
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

  async backfillSubscriptionBaseline(): Promise<void> {
    logger.info('Starting BRPUser subscription-baseline backfill (one-off)', {
      migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
    });

    const users = await BRPUser.find({});
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const result = await this.backfillUserBaseline(user);
        if (result === 'updated') updated++;
        else skipped++;
      } catch (error) {
        logger.error('Backfill baseline: error processing user', {
          migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
          brpId: user.brpId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        failed++;
      }
    }

    logger.info('BRPUser subscription-baseline backfill complete (one-off)', {
      migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
      total: users.length,
      updated,
      skipped,
      failed,
    });
  }

  /**
   * Seed a single user's current-plan baseline from their active Pulse Club subscription.
   * Idempotent: only fills missing identity fields; never touches amount/initialAmount.
   */
  private async backfillUserBaseline(user: IBRPUser): Promise<'updated' | 'skipped'> {
    const subscriptions = await brpApiService.getCustomerSubscriptions(user.brpId);
    const subscription = subscriptions.find((sub: BRPSubscription) =>
      sub.subscriptionProduct.name.toLowerCase().includes('pulse club')
    );

    if (!subscription) {
      logger.warn('Backfill baseline: no Pulse Club subscription, skipping', {
        migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
        brpId: user.brpId,
      });
      return 'skipped';
    }

    const set: Partial<{
      subscriptionId: number;
      subscriptionName: string;
      subscriptionStartDate: Date;
      subscriptionBoundUntil: Date;
      leftovers: IBRPLeftover[];
    }> = {
      subscriptionId: subscription.id,
      subscriptionName: subscription.subscriptionProduct.name,
    };
    if (subscription.boundUntil) set.subscriptionBoundUntil = new Date(subscription.boundUntil);
    if (!user.subscriptionStartDate && subscription.start) {
      set.subscriptionStartDate = new Date(subscription.start);
    }
    if (!user.leftovers) set.leftovers = [];

    await BRPUser.findOneAndUpdate({ brpId: user.brpId }, { $set: set });

    logger.info('Backfill baseline: updated user', {
      migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
      brpId: user.brpId,
      subscriptionId: subscription.id,
      subscriptionName: subscription.subscriptionProduct.name,
      boundUntil: subscription.boundUntil,
    });
    return 'updated';
  }
}

// Export singleton instance
export const brpUserService = new BRPUserService();
export { BRPUserService };
export default brpUserService;

