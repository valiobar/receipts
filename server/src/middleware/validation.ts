import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/api-response';

/**
 * Validation middleware factory
 * Validates request body/query/params against schema
 */
export const validate = (schema: {
  body?: Record<string, (value: unknown) => boolean | string>;
  query?: Record<string, (value: unknown) => boolean | string>;
  params?: Record<string, (value: unknown) => boolean | string>;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};
    
    // Validate body
    if (schema.body) {
      for (const [field, validator] of Object.entries(schema.body)) {
        const value = req.body[field];
        const result = validator(value);
        
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : `Invalid ${field}`;
        }
      }
    }
    
    // Validate query
    if (schema.query) {
      for (const [field, validator] of Object.entries(schema.query)) {
        const value = req.query[field];
        const result = validator(value);
        
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : `Invalid ${field}`;
        }
      }
    }
    
    // Validate params
    if (schema.params) {
      for (const [field, validator] of Object.entries(schema.params)) {
        const value = req.params[field];
        const result = validator(value);
        
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : `Invalid ${field}`;
        }
      }
    }
    
    if (Object.keys(errors).length > 0) {
      sendError(
        req,
        res,
        'VALIDATION_ERROR',
        'Check the form for errors.',
        422,
        errors
      );
      return;
    }
    
    next();
  };
};

// Common validators
export const validators = {
  required: (value: unknown): boolean | string => {
    if (value === undefined || value === null || value === '') {
      return 'This field is required.';
    }
    return true;
  },
  
  string: (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return 'Must be a string.';
    }
    return true;
  },
  
  number: (value: unknown): boolean | string => {
    if (typeof value !== 'number' && isNaN(Number(value))) {
      return 'Must be a number.';
    }
    return true;
  },
  
  email: (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return 'Must be a string.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Must be a valid email address.';
    }
    return true;
  },
  
  minLength: (min: number) => (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return 'Must be a string.';
    }
    if (value.length < min) {
      return `Must be at least ${min} characters.`;
    }
    return true;
  },
  
  date: (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return 'Must be a string.';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Must be a valid date (ISO 8601 format).';
    }
    return true;
  },
  
  oneOf: (allowed: unknown[]) => (value: unknown): boolean | string => {
    if (!allowed.includes(value)) {
      return `Must be one of: ${allowed.join(', ')}.`;
    }
    return true;
  },
  
  boolean: (value: unknown): boolean | string => {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      return 'Must be a boolean.';
    }
    return true;
  },
};

