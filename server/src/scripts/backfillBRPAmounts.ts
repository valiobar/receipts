import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import brpUserService from '../services/BRPUserService';
import logger from '../config/winston';

const main = async (): Promise<void> => {
  logger.info('Backfill script started');

  await connectDatabase();
  await brpUserService.backfillInitialAmounts();
  await mongoose.disconnect();

  logger.info('Backfill script finished, database disconnected');
};

main().catch((error) => {
  logger.error('Backfill script failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
