import mongoose from 'mongoose';
import logger from './winston';
import { env } from '../utils/env';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
    };

    await mongoose.connect(env.mongodbUri, options);

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully', {
        uri: env.mongodbUri.replace(/\/\/.*@/, '//***:***@'), // Mask credentials in logs
      });
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

