import { Request, Response, NextFunction } from 'express';
import logger from '../config/winston';
import { env } from '../utils/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error status code
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log error
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    statusCode,
    code,
    error: err.message,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
  });

  // Prepare error response
  const errorResponse: {
    success: false;
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } = {
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected error occurred',
    },
  };

  // Include details in development or for client errors (4xx)
  if (env.nodeEnv === 'development' || statusCode < 500) {
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  }

  // Include stack trace only in development
  if (env.nodeEnv === 'development' && err.stack) {
    const existingDetails =
      errorResponse.error.details &&
      typeof errorResponse.error.details === 'object' &&
      !Array.isArray(errorResponse.error.details)
        ? errorResponse.error.details
        : {};
    errorResponse.error.details = {
      ...existingDetails,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Helper function to create application errors
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

