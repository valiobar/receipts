import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { sendSuccess, sendError } from '../utils/api-response';
import logger from '../config/winston';

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || typeof username !== 'string' || username.length < 3) {
      sendError(
        req,
        res,
        'VALIDATION_ERROR',
        'Check the form for errors.',
        422,
        {
          username: 'Please provide your username.',
        }
      );
      return;
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      sendError(
        req,
        res,
        'VALIDATION_ERROR',
        'Check the form for errors.',
        422,
        {
          password: 'Password must have at least 6 characters.',
        }
      );
      return;
    }
    
    // Authenticate user
    let result;
    try {
      result = await authService.login(username, password);
    } catch (error) {
      // AuthService throws error on invalid credentials
      sendError(req, res, 'AUTH_INVALID', 'Incorrect username or password', 200);
      return;
    }
    
    // Send success response
    sendSuccess(req, res, {
      token: result.token,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        roles: result.user.roles,
      },
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : String(error),
      username: req.body.username,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh JWT token before expiration
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(req, res, 'AUTH_REQUIRED', 'Authentication required', 401);
      return;
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(req, res, 'AUTH_REQUIRED', 'Authentication required', 401);
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Generate new token using refreshToken method
    let newToken;
    try {
      newToken = await authService.refreshToken(token);
    } catch (error) {
      sendError(req, res, 'AUTH_INVALID', 'Invalid or expired token', 401);
      return;
    }
    
    sendSuccess(req, res, {
      token: newToken.token,
      expiresIn: newToken.expiresIn,
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * POST /api/auth/logout
 * Invalidate current token (logout)
 * Note: With JWT, logout is typically handled client-side by removing token
 * This endpoint exists for consistency and future token blacklisting
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Token invalidation would be handled here if implementing token blacklist
    // For now, just return success (client removes token)
    
    sendSuccess(req, res, {
      message: 'Successfully logged out',
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

