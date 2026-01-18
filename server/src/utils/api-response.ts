import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Request ID middleware - adds unique ID to each request
export const requestIdMiddleware = (req: Request, res: Response, next: () => void): void => {
  (req as any).requestId = randomUUID();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
};

// Success response format
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// Error response format
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  req: Request,
  res: Response,
  data: T,
  statusCode: number = 200
): void => {
  const requestId = (req as any).requestId || randomUUID();
  
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  req: Request,
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): void => {
  const requestId = (req as any).requestId || randomUUID();
  
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  res.status(statusCode).json(response);
};

