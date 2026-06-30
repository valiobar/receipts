import { Request, Response } from 'express';
import { receiptService } from '../services/ReceiptService';
import { sendSuccess, sendError } from '../utils/api-response';
import logger from '../config/winston';

/**
 * GET /api/receipts
 * Retrieve list of receipts with filtering and pagination
 */
export const listReceipts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse query parameters
    const deviceId = req.query.deviceId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const customerNumber = req.query.customerNumber as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'ts';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    
    // Validate limit (max 100)
    const validatedLimit = Math.min(limit, 100);
    
    // Query receipts
    const result = await receiptService.queryReceipts({
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      customerNumber,
      limit: validatedLimit,
      offset,
      sortBy,
      sortOrder,
    });
    
    // Transform receipts: convert brpUserId to user property
    const receiptsWithUserData = result.receipts.map((receipt) => {
      const receiptObj = receipt.toObject ? receipt.toObject() : receipt;
      const brpUser = receiptObj.brpUserId;
      
      // Transform to user property
      const user = brpUser ? {
        brpId: brpUser.brpId,
        firstName: brpUser.firstName,
        lastName: brpUser.lastName,
        customerNumber: brpUser.customerNumber,
        amount: brpUser.amount,
        initialAmount: brpUser.initialAmount,
        subscriptionStartDate: brpUser.subscriptionStartDate ? brpUser.subscriptionStartDate.toISOString() : undefined,
        subscriptionBoundUntil: brpUser.subscriptionBoundUntil ? brpUser.subscriptionBoundUntil.toISOString() : undefined,
        tsCreated: brpUser.tsCreated ? brpUser.tsCreated.toISOString() : undefined,
      } : null;
      
      // Remove brpUserId from response, add user
      const { brpUserId, ...receiptWithoutBrpUserId } = receiptObj;
      return {
        ...receiptWithoutBrpUserId,
        user,
      };
    });
    
    sendSuccess(req, res, {
      receipts: receiptsWithUserData,
      pagination: {
        total: result.pagination.total,
        limit: validatedLimit,
        offset,
        hasMore: result.pagination.hasMore,
      },
    });
  } catch (error) {
    logger.error('List receipts error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/receipts/:id
 * Retrieve a specific receipt by ID
 */
export const getReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const receipt = await receiptService.getReceiptById(id);
    
    if (!receipt) {
      sendError(req, res, 'NOT_FOUND', 'Receipt not found', 404);
      return;
    }
    
    // Transform receipt: convert brpUserId to user property
    const receiptObj = receipt.toObject ? receipt.toObject() : receipt;
    const brpUser = receiptObj.brpUserId;
    
    // Transform to user property
    const user = brpUser ? {
      brpId: brpUser.brpId,
      firstName: brpUser.firstName,
      lastName: brpUser.lastName,
      customerNumber: brpUser.customerNumber,
      amount: brpUser.amount,
      initialAmount: brpUser.initialAmount,
      subscriptionStartDate: brpUser.subscriptionStartDate ? brpUser.subscriptionStartDate.toISOString() : undefined,
      subscriptionBoundUntil: brpUser.subscriptionBoundUntil ? brpUser.subscriptionBoundUntil.toISOString() : undefined,
      tsCreated: brpUser.tsCreated ? brpUser.tsCreated.toISOString() : undefined,
    } : null;
    
    // Remove brpUserId from response, add user
    const { brpUserId, ...receiptWithoutBrpUserId } = receiptObj;
    const receiptWithUser = {
      ...receiptWithoutBrpUserId,
      user,
    };
    
    sendSuccess(req, res, { receipt: receiptWithUser });
  } catch (error) {
    logger.error('Get receipt error', {
      error: error instanceof Error ? error.message : String(error),
      receiptId: req.params.id,
    });
    
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

/**
 * GET /api/receipts/export
 * Export receipts to Excel file (streaming)
 */
export const exportReceipts = async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const deviceId = req.query.deviceId as string | undefined;
    const customerNumber = req.query.customerNumber as string | undefined;
    const format = (req.query.format as 'xlsx' | 'csv') || 'xlsx';

    if (!startDate || !endDate) {
      sendError(
        req,
        res,
        'VALIDATION_ERROR',
        'Start date and end date are required',
        400,
        {
          startDate: startDate ? undefined : 'Start date is required',
          endDate: endDate ? undefined : 'End date is required',
        }
      );
      return;
    }

    const stream = await receiptService.exportReceiptsToExcel({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      deviceId,
      customerNumber,
    });

    const filename = `report-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader(
      'Content-Type',
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.on('error', (err) => {
      logger.error('Export receipts stream error', {
        error: err.message,
        filename,
      });
      if (res.headersSent) {
        res.end();
      } else {
        sendError(req, res, 'INTERNAL_ERROR', 'Export failed', 500);
      }
    });

    stream.pipe(res);
  } catch (error) {
    logger.error('Export receipts error', {
      error: error instanceof Error ? error.message : String(error),
    });
    sendError(req, res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

