import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import logger from './winston';
import { env } from '../utils/env';
import { requestIdMiddleware } from '../utils/api-response';
import apiRoutes from '../routes';
import webhookRoutes from '../routes/webhook-routes';

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

  // Request ID middleware (must be before request logging)
  app.use(requestIdMiddleware);

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: (req as any).requestId,
    });
    next();
  });

  // API routes (must be before static file serving)
  app.use('/api', apiRoutes);

  // Webhook routes (must be before static file serving)
  app.use('/webhook', webhookRoutes);

  // Static file serving (for Phase 8 - frontend build)
  // Resolve public path: works in both dev (src/config) and production (dist/config)
  // From src/config or dist/config, go up two levels to server root, then into public
  const publicPath = path.resolve(__dirname, '../../public');
  app.use(express.static(publicPath));

  // Catch-all handler: serve React SPA for all non-API routes
  // This allows React Router to handle client-side routing
  // IMPORTANT: Skip WebSocket upgrade requests - express-ws will handle them
  app.get('*', (req, res, next) => {
    // Skip API, webhook, and WebSocket routes
    // Also skip if this is a WebSocket upgrade request (express-ws handles these)
    if (
      req.path.startsWith('/api') || 
      req.path.startsWith('/webhook') || 
      req.path.startsWith('/ws') || 
      req.path.startsWith('/client') ||
      req.headers.upgrade === 'websocket'
    ) {
      // For WebSocket routes, let express-ws handle it (don't send response)
      if (req.headers.upgrade === 'websocket') {
        return next(); // Pass to express-ws
      }
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Serve index.html for all other routes (React Router will handle routing)
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  logger.info('Express app configured', {
    nodeEnv: env.nodeEnv,
    publicPath,
  });

  return app;
};

