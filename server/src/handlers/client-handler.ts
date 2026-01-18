import http from 'http';
import { WebSocket } from 'ws';
import { connectionManager } from '../managers/ConnectionManager';
import logger from '../config/winston';

/**
 * Setup client WebSocket handler
 * Handles connections to /client
 * Uses express-ws pattern: app.ws('/client', handler)
 */
export const setupClientHandler = (app: any, server: http.Server): void => {
  // express-ws is already initialized in server.ts
  // Just set up the route handler
  app.ws('/client', (ws: WebSocket, req: any) => {
    logger.info('Client connection attempt', {
      clientIp: req.socket.remoteAddress,
    });
    
    // Optional: JWT authentication (per documentation, not required)
    // Can be added later if needed:
    // const token = req.query?.token;
    // if (token && !validateToken(token)) {
    //   ws.close(1008, 'Invalid token');
    //   return;
    // }
    
    // Register client connection
    connectionManager.registerClient(ws);
    
    // Handle client disconnect
    ws.on('close', (code: number, reason: Buffer) => {
      logger.info('Client disconnected', {
        code,
        reason: reason.toString(),
      });
      
      connectionManager.removeClient(ws);
    });
    
    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error('Client socket error', {
        error: error.message,
      });
    });
    
    // Optional: Handle client messages (future feature)
    // ws.on('message', (data: Buffer) => {
    //   handleClientMessage(ws, data.toString());
    // });
  });
  
  logger.info('Client WebSocket handler initialized');
};

