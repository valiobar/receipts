import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './utils/env';
import logger from './config/winston';
import { connectDatabase } from './config/database';
import { createApp } from './config/express';
import { errorHandler } from './middleware/error-handler';
import { initializeServices } from './services/initialize';

const startServer = async (): Promise<void> => {
  try {
    // 1. Environment variables are loaded via env import (Step 1)
    logger.info('Starting server...', { nodeEnv: env.nodeEnv, port: env.port });

    // 2. Connect to database
    await connectDatabase();

    // 2.5. Initialize services (after database, before app creation)
    await initializeServices();

    // 3. Create Express app
    const app = createApp();

    // 4. Create HTTP server
    const server = http.createServer(app);

    // 5. Initialize Socket.IO (basic setup, full implementation in Phase 5)
    const io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    // Store io instance for use in Phase 5
    // This will be exported from a connection manager in Phase 5
    (app as any).io = io;

    // 6. Apply error handler middleware (must be last)
    app.use(errorHandler);

    // 7. Start HTTP server
    server.listen(env.port, () => {
      logger.info('Server started successfully', {
        port: env.port,
        nodeEnv: env.nodeEnv,
        mongodbUri: env.mongodbUri.replace(/\/\/.*@/, '//***:***@'),
      });
    });

    // 8. Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      io.close(() => {
        logger.info('Socket.IO server closed');
      });

      // Close database connection
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error });
      shutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

// Start the server
startServer();

