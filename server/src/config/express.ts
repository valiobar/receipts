import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import logger from './winston';
import { env } from '../utils/env';

export const createApp = (): Express => {
  const app = express();

  // Trust proxy for accurate IP addresses (important for webhook IP validation)
  app.set('trust proxy', true);

  // CORS configuration
  app.use(
    cors({
      origin:
        env.nodeEnv === 'production'
          ? process.env.CORS_ORIGIN || '*'
          : '*',
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Static file serving (for Phase 8 - frontend build)
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  logger.info('Express app configured', {
    nodeEnv: env.nodeEnv,
    publicPath,
  });

  return app;
};

