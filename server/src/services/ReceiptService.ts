import { PassThrough } from 'node:stream';
import { Receipt, ReceiptStatus, IReceiptDocument, CommandType, ICommandDocument, Device } from '../models';
import { BRPUser } from '../models/BRPUser';
import logger from '../config/winston';
import ExcelJS from 'exceljs';
import { brpUserService } from './BRPUserService';
import type { BRPSubscription } from '../types/brp-api';
import type { Types } from 'mongoose';

/** Receipt row for export - matches Receipts Table columns */
interface ExportReceiptRow {
  timestamp: string;
  device: string;
  amount: string;
  customerNumber: string;
  userName: string;
  remainVouchers: string;
  initialVouchers: string;
  usedVouchers: string;
  subscriptionName: string;
  subscriptionStart: string;
  subscriptionEnd: string;
}

const formatAmountForExport = (amount: string): string => {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatIntegerForExport = (value: string | number): string => {
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (Number.isNaN(num)) return 'N/A';
  return Math.floor(num).toString();
};

const formatTimestampForExport = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

const formatSubscriptionDateForExport = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);

// Receipt query filters
export interface ReceiptFilters {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
  customerNumber?: string;
  status?: ReceiptStatus;
  limit?: number
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Receipt query result
export interface ReceiptQueryResult {
  receipts: IReceiptDocument[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Receipt statistics
export interface ReceiptStatistics {
  total: number;
  pending: number;
  processed: number;
  byDevice: Record<string, number>;
  byStatus: Record<ReceiptStatus, number>;
}

/**
 * ReceiptService - Manages receipt data operations
 */
class ReceiptService {
  /**
   * Query receipts with filters and pagination
   */
  async queryReceipts(filters: ReceiptFilters): Promise<ReceiptQueryResult> {
    const {
      deviceId,
      startDate,
      endDate,
      customerNumber,
      limit = 50,
      offset = 0,
      sortBy = 'ts',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    if (deviceId) {
      query.device = deviceId;
    }

    // Handle customerNumber filter (filter by BRPUser customerNumber)
    if (customerNumber) {
      // Find BRPUser documents with matching customerNumber (supports partial matches)
      const brpUsers = await BRPUser.find({
        customerNumber: { $regex: customerNumber, $options: 'i' },
      })
        .select('_id')
        .exec();
      
      const brpUserIds: Types.ObjectId[] = brpUsers.map((user) => user._id);
      
      if (brpUserIds.length > 0) {
        // Filter receipts by brpUserId
        query.brpUserId = { $in: brpUserIds };
      } else {
        // If no BRP users found with this customer number, return empty result
        query.brpUserId = { $in: [] };
      }
    }

    if (startDate || endDate) {
      query.ts = {};
      if (startDate) {
        query.ts.$gte = startDate;
      }
      if (endDate) {
        // Include entire end date (end of day)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.ts.$lte = endOfDay;
      }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .populate('brpUserId', 'brpId firstName lastName customerNumber amount initialAmount subscriptionStartDate subscriptionBoundUntil tsCreated')
        .sort(sort)
        .limit(limit)
        .skip(offset)
        .exec(),
      Receipt.countDocuments(query).exec(),
    ]);

    logger.debug('Receipts queried', {
      count: receipts.length,
      total,
      filters,
    });

    return {
      receipts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + receipts.length < total,
      },
    };
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<IReceiptDocument | null> {
    const receipt = await Receipt.findById(receiptId)
      .populate('brpUserId', 'brpId firstName lastName customerNumber amount initialAmount subscriptionStartDate subscriptionBoundUntil tsCreated')
      .exec();
    
    if (!receipt) {
      logger.debug('Receipt not found', { receiptId });
    }

    return receipt;
  }

  /**
   * Get receipt statistics
   */
  async getReceiptStatistics(filters?: {
    deviceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ReceiptStatistics> {
    const query: any = {};

    if (filters?.deviceId) {
      query.device = filters.deviceId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.ts = {};
      if (filters.startDate) {
        query.ts.$gte = filters.startDate;
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.ts.$lte = endOfDay;
      }
    }

    const [total, pending, processed, byDevice, byStatus] = await Promise.all([
      Receipt.countDocuments(query).exec(),
      Receipt.countDocuments({ ...query, Status: ReceiptStatus.PENDING }).exec(),
      Receipt.countDocuments({ ...query, Status: ReceiptStatus.PROCESSED }).exec(),
      Receipt.aggregate([
        { $match: query },
        { $group: { _id: '$device', count: { $sum: 1 } } },
      ]).exec(),
      Receipt.aggregate([
        { $match: query },
        { $group: { _id: '$Status', count: { $sum: 1 } } },
      ]).exec(),
    ]);

    // Format byDevice
    const byDeviceMap: Record<string, number> = {};
    byDevice.forEach((item: any) => {
      byDeviceMap[item._id] = item.count;
    });

    // Format byStatus
    const byStatusMap: Record<ReceiptStatus, number> = {
      [ReceiptStatus.PENDING]: 0,
      [ReceiptStatus.PROCESSED]: 0,
    };
    byStatus.forEach((item: any) => {
      byStatusMap[item._id as ReceiptStatus] = item.count;
    });

    return {
      total,
      pending,
      processed,
      byDevice: byDeviceMap,
      byStatus: byStatusMap,
    };
  }

  /**
   * Export receipts to Excel (streaming) - columns match Receipts Table
   */
  async exportReceiptsToExcel(filters: {
    startDate: Date;
    endDate: Date;
    deviceId?: string;
    customerNumber?: string;
  }): Promise<NodeJS.ReadableStream> {
    const outputStream = new PassThrough();

    // Build base query (date range)
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: Record<string, unknown> = {
      ts: {
        $gte: filters.startDate,
        $lte: endOfDay,
      },
    };

    if (filters.deviceId) {
      query.device = filters.deviceId;
    }

    // Customer number filter (same logic as queryReceipts)
    if (filters.customerNumber) {
      const brpUsers = await BRPUser.find({
        customerNumber: { $regex: filters.customerNumber, $options: 'i' },
      })
        .select('_id')
        .exec();

      const brpUserIds: Types.ObjectId[] = brpUsers.map((user) => user._id);
      query.brpUserId = brpUserIds.length > 0 ? { $in: brpUserIds } : { $in: [] };
    }

    // Load device names for lookup (deviceId -> name)
    const devices = await Device.find().select('deviceId name').lean().exec();
    const deviceNameMap = new Map<string, string>();
    for (const d of devices) {
      deviceNameMap.set(d.deviceId, d.name || d.deviceId);
    }

    // Create streaming workbook writer
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outputStream,
      useStyles: true,
    });

    // Columns match Receipts Table exactly
    const worksheet = workbook.addWorksheet('Receipts');
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 18 },
      { header: 'Device', key: 'device', width: 20 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Customer Number', key: 'customerNumber', width: 18 },
      { header: 'User Name', key: 'userName', width: 14 },
      { header: 'Remain Vouchers', key: 'remainVouchers', width: 16 },
      { header: 'Initial Vouchers', key: 'initialVouchers', width: 16 },
      { header: 'Used Vouchers', key: 'usedVouchers', width: 14 },
      { header: 'Subscription Name', key: 'subscriptionName', width: 28 },
      { header: 'Subscription Start', key: 'subscriptionStart', width: 18 },
      { header: 'Subscription End', key: 'subscriptionEnd', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.commit();

    // Use aggregation with $lookup to get user data, then cursor for streaming
    const cursor = Receipt.aggregate([
      { $match: query },
      { $sort: { ts: -1 } },
      {
        $lookup: {
          from: 'brpusers',
          localField: 'brpUserId',
          foreignField: '_id',
          as: 'brpUser',
        },
      },
      {
        $unwind: {
          path: '$brpUser',
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
      .cursor();

    const processCursor = async (): Promise<void> => {
      try {
        for await (const doc of cursor) {
          const row = this.buildExportRow(doc, deviceNameMap);
          worksheet.addRow(row).commit();
        }

        worksheet.commit();
        await workbook.commit();
        outputStream.end();
      } catch (error) {
        logger.error('Export receipts streaming error', {
          error: error instanceof Error ? error.message : String(error),
          filters,
        });
        outputStream.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    };

    processCursor();
    return outputStream;
  }

  /**
   * Build export row - same data and formatting as Receipts Table
   */
  private buildExportRow(
    doc: {
      device: string;
      amount: string;
      MembershipFee?: string;
      userNumber?: string;
      ts: Date;
      brpUser?: {
        firstName?: string;
        lastName?: string;
        customerNumber?: string;
        amount?: number;
        initialAmount?: number;
        subscriptionName?: string;
        subscriptionStartDate?: Date;
        subscriptionBoundUntil?: Date;
      } | null;
    },
    deviceNameMap: Map<string, string>
  ): ExportReceiptRow {
    const brpUser = doc.brpUser;
    const deviceName = deviceNameMap.get(doc.device) ?? doc.device;

    const userName =
      brpUser?.firstName && brpUser?.lastName
        ? `${brpUser.firstName.charAt(0).toUpperCase()}.${brpUser.lastName}`
        : (doc.userNumber ?? 'N/A');

    const remainVouchers =
      brpUser?.amount !== undefined
        ? formatIntegerForExport(brpUser.amount)
        : formatIntegerForExport(doc.MembershipFee ?? '0');

    const initialVouchers =
      brpUser?.initialAmount !== undefined
        ? formatIntegerForExport(brpUser.initialAmount)
        : 'N/A';

    const usedVouchers =
      brpUser?.initialAmount !== undefined && brpUser?.amount !== undefined
        ? formatIntegerForExport(brpUser.initialAmount - brpUser.amount)
        : 'N/A';

    const subscriptionName = brpUser?.subscriptionName ?? 'N/A';

    const subscriptionStart =
      brpUser?.subscriptionStartDate
        ? formatSubscriptionDateForExport(brpUser.subscriptionStartDate)
        : 'N/A';

    const subscriptionEnd =
      brpUser?.subscriptionBoundUntil
        ? formatSubscriptionDateForExport(brpUser.subscriptionBoundUntil)
        : 'N/A';

    return {
      timestamp: formatTimestampForExport(doc.ts),
      device: deviceName,
      amount: formatAmountForExport(doc.amount),
      customerNumber: brpUser?.customerNumber ?? 'N/A',
      userName,
      remainVouchers,
      initialVouchers,
      usedVouchers,
      subscriptionName,
      subscriptionStart,
      subscriptionEnd,
    };
  }

  /**
   * Get last receipt for a device
   */
  async getLastReceipt(deviceId: string): Promise<IReceiptDocument | null> {
    return Receipt.getLastReceipt(deviceId);
  }

  /**
   * Get pending receipt for a device
   */
  async getPendingReceipt(deviceId: string): Promise<IReceiptDocument | null> {
    return Receipt.getPending(deviceId);
  }

  /**
   * Change receipt status to processed
   */
  async changeReceiptStatus(receiptId: string): Promise<IReceiptDocument | null> {
    return Receipt.changeStatus(receiptId);
  }

  /**
   * Create a receipt document from a completed command
   * Only creates receipts for RECEIPT type commands
   */
  async createReceiptFromCommand(command: ICommandDocument): Promise<IReceiptDocument | null> {
    // Validate command type
    if (command.commandType !== CommandType.RECEIPT) {
      logger.debug('Command is not a receipt type, skipping receipt creation', {
        commandId: command._id,
        commandType: command.commandType,
      });
      return null;
    }

    try {
      // Map Command fields to Receipt fields
      const receiptData = {
        device: command.deviceId,
        amount: command.amount || '0',
        MembershipFee: command.membershipFee || '0',
        userNumber: command.userNumber || '',
        location: command.location || '',
        ip: command.webhookRequestIp || 'unknown',
        Status: ReceiptStatus.PROCESSED,
        ts: new Date(),
      };

      // Validate required fields
      if (!receiptData.device || !receiptData.userNumber) {
        logger.error('Missing required fields for receipt creation', {
          commandId: command._id,
          device: receiptData.device,
          userNumber: receiptData.userNumber,
        });
        return null;
      }

      // Find BRPUser before creating receipt (if userNumber is valid)
      let brpUser = null;
      let personId: number | null = null;
      
      if (receiptData.userNumber) {
        personId = parseInt(receiptData.userNumber, 10);
        
        if (!isNaN(personId) && personId > 0) {
          // Try to find by brpId (numeric userNumber is BRP person ID)
          brpUser = await BRPUser.findOne({ brpId: personId }).exec();
        }
        
        // If not found by brpId, try by customerNumber
        if (!brpUser) {
          brpUser = await BRPUser.findOne({ customerNumber: receiptData.userNumber }).exec();
        }
        
        // If BRPUser found, store its _id
        if (brpUser) {
          (receiptData as any).brpUserId = brpUser._id;
          logger.debug('BRPUser found and linked to receipt', {
            brpUserId: brpUser._id,
            userNumber: receiptData.userNumber,
          });
        }
      }

      // Create and save Receipt document
      const receipt = new Receipt(receiptData);
      const savedReceipt = await receipt.save();

      logger.info('Receipt created from command', {
        receiptId: savedReceipt._id,
        commandId: command._id,
        device: command.deviceId,
        userNumber: command.userNumber,
      });

      // Process Pulse Club amount if userNumber is a valid numeric ID (BRP person ID)
      if (savedReceipt.userNumber) {
        const personIdForProcessing = personId || parseInt(savedReceipt.userNumber, 10);
        if (!isNaN(personIdForProcessing) && personIdForProcessing > 0) {
          // Only process if userNumber is a valid numeric ID (BRP person IDs are numeric)
          try {
            // Extract subscription from command if available
            const pulseClubSubscription = command.pulseClubSubscription as BRPSubscription | undefined;
            
            // Pass subscription data to avoid duplicate API call
            await brpUserService.processPulseClubAmount(personIdForProcessing, pulseClubSubscription);
            logger.debug('Pulse Club amount processed after receipt creation', {
              receiptId: savedReceipt._id,
              personId: personIdForProcessing,
              subscriptionProvided: !!pulseClubSubscription,
            });

            // After processing, BRPUser might have been created/updated, so update receipt if needed
            if (!savedReceipt.brpUserId) {
              const updatedBrpUser = await BRPUser.findOne({ brpId: personIdForProcessing }).exec();
              if (updatedBrpUser) {
                savedReceipt.brpUserId = updatedBrpUser._id;
                await savedReceipt.save();
                logger.debug('BRPUser linked to receipt after Pulse Club processing', {
                  receiptId: savedReceipt._id,
                  brpUserId: updatedBrpUser._id,
                });
              }
            }
          } catch (error) {
            logger.error('Error processing Pulse Club amount after receipt creation', {
              receiptId: savedReceipt._id,
              personId: personIdForProcessing,
              error: error instanceof Error ? error.message : String(error),
            });
            // Don't throw - receipt creation should still succeed
          }
        }
      }

      return savedReceipt;
    } catch (error) {
      logger.error('Error creating receipt from command', {
        commandId: command._id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - command completion should still succeed
      return null;
    }
  }
}

// Export singleton instance
export const receiptService = new ReceiptService();
export { ReceiptService };
export default receiptService;

