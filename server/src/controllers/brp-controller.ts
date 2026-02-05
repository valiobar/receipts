import { Request, Response } from 'express';
import { brpApiService } from '../services/BRPApiService';
import { sendSuccess, sendError } from '../utils/api-response';
import logger from '../config/winston';

/**
 * GET /api/brp/customers/:id
 * Get customer by ID from BRP API
 */
export const getBRPCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate customer ID
    if (!id) {
      sendError(req, res, 'VALIDATION_ERROR', 'Customer ID is required', 422, {
        id: 'Customer ID is required',
      });
      return;
    }

    // Check if BRP API is configured
    if (!brpApiService.isConfigured()) {
      sendError(
        req,
        res,
        'SERVICE_UNAVAILABLE',
        'BRP API is not configured',
        503
      );
      return;
    }

    // Fetch customer from BRP API
    const customer = await brpApiService.getCustomerById(id);

    logger.debug('BRP customer fetched successfully', {
      customerId: id,
    });

    sendSuccess(req, res, customer);
  } catch (error) {
    logger.error('Error fetching BRP customer', {
      error: error instanceof Error ? error.message : String(error),
      customerId: req.params.id,
    });

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        sendError(
          req,
          res,
          'SERVICE_UNAVAILABLE',
          'BRP API is not configured',
          503
        );
        return;
      }

      if (error.message.includes('404') || error.message.includes('Not Found')) {
        sendError(req, res, 'NOT_FOUND', 'Customer not found', 404);
        return;
      }
    }

    sendError(req, res, 'INTERNAL_ERROR', 'Failed to fetch customer', 500);
  }
};

/**
 * POST /api/brp/auth/login
 * Manual login to BRP API (optional, for testing)
 */
export const loginBRP = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if BRP API is configured
    if (!brpApiService.isConfigured()) {
      sendError(
        req,
        res,
        'SERVICE_UNAVAILABLE',
        'BRP API is not configured',
        503
      );
      return;
    }

    // Attempt login
    await brpApiService.login();

    logger.info('BRP API manual login successful');

    sendSuccess(req, res, { message: 'BRP API login successful' });
  } catch (error) {
    logger.error('BRP API manual login failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        sendError(
          req,
          res,
          'SERVICE_UNAVAILABLE',
          'BRP API is not configured',
          503
        );
        return;
      }

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        sendError(
          req,
          res,
          'AUTH_INVALID',
          'Invalid BRP API credentials',
          401
        );
        return;
      }
    }

    sendError(req, res, 'INTERNAL_ERROR', 'Failed to login to BRP API', 500);
  }
};

