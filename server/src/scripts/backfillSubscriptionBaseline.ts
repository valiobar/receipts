import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import brpUserService from '../services/BRPUserService';
import logger from '../config/winston';

const main = async (): Promise<void> => {
  logger.info('Starting one-off subscription-baseline backfill script', {
    migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
  });
  logger.warn('Running one-off data migration. Do not execute more than once.', {
    migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
  });

  await connectDatabase();
  await brpUserService.backfillSubscriptionBaseline();
  await mongoose.disconnect();

  logger.info('Finished one-off subscription-baseline backfill, database disconnected', {
    migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
  });
};

main().catch((error) => {
  logger.error('One-off subscription-baseline backfill failed', {
    migration: 'BACKFILL_SUBSCRIPTION_BASELINE',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
