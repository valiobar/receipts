import http from 'http';
import mongoose from 'mongoose';
import { env } from './utils/env';
import logger from './config/winston';
import { connectDatabase } from './config/database';
import { createApp } from './config/express';
import { errorHandler } from './middleware/error-handler';
import { initializeServices } from './services/initialize';
import { setupDeviceHandler, setupClientHandler } from './handlers';

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

    // 4. Create HTTP server (needed for express-ws)
    const server = http.createServer(app);

    // 5. Initialize express-ws once (must be done before setting up routes)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('express-ws')(app, server);

    // 6. Setup WebSocket handlers (after express-ws initialization)
    setupDeviceHandler(app, server);
    setupClientHandler(app, server);

    // 7. Apply error handler middleware (must be last)
    app.use(errorHandler);

    // 8. Start HTTP server
    server.listen(env.port, () => {
      logger.info('Server started successfully', {
        port: env.port,
        nodeEnv: env.nodeEnv,
        mongodbUri: env.mongodbUri.replace(/\/\/.*@/, '//***:***@'),
      });
    });

    // 9. Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
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

