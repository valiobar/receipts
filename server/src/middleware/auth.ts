import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { sendError } from '../utils/api-response';
import logger from '../config/winston';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        roles: string[];
      };
      requestId?: string;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(req, res, 'AUTH_REQUIRED', 'Authentication required', 401);
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const validation = authService.validateToken(token);
    
    if (!validation.valid || !validation.payload) {
      sendError(req, res, 'AUTH_INVALID', 'Invalid or expired token', 401);
      return;
    }
    
    // Extract user info from JWT payload
    const payload = validation.payload;
    
    // Attach user to request
    req.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    
    sendError(req, res, 'AUTH_INVALID', 'Invalid or expired token', 401);
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role(s)
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(req, res, 'AUTH_REQUIRED', 'Authentication required', 401);
      return;
    }
    
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      sendError(
        req,
        res,
        'AUTH_INSUFFICIENT',
        'Insufficient permissions',
        403
      );
      return;
    }
    
    next();
  };
};

