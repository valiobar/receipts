import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import brpUserService from '../services/BRPUserService';
import logger from '../config/winston';

const main = async (): Promise<void> => {
  logger.info('Starting one-off BRP halving migration script', {
    migration: 'HALVE_BRP_USER_AMOUNTS',
  });
  logger.warn('Running one-off data migration. Do not execute more than once.', {
    migration: 'HALVE_BRP_USER_AMOUNTS',
  });

  await connectDatabase();
  await brpUserService.backfillHalvedInitialAmounts();
  await mongoose.disconnect();

  logger.info('Finished one-off BRP halving migration script, database disconnected', {
    migration: 'HALVE_BRP_USER_AMOUNTS',
  });
};

main().catch((error) => {
  logger.error('One-off BRP halving migration script failed', {
    migration: 'HALVE_BRP_USER_AMOUNTS',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
