import { Receipt, ReceiptStatus, IReceiptDocument } from '../models';
import logger from '../config/winston';
import ExcelJS from 'exceljs';

// Receipt query filters
export interface ReceiptFilters {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
  userNumber?: string;
  status?: ReceiptStatus;
  limit?: number;
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
      userNumber,
      status,
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

    if (userNumber) {
      query.userNumber = userNumber;
    }

    if (status) {
      query.Status = status;
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
    const receipt = await Receipt.findById(receiptId).exec();
    
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
   * Export receipts to Excel
   */
  async exportReceiptsToExcel(filters: {
    startDate: Date;
    endDate: Date;
    deviceId?: string;
  }): Promise<Buffer> {
    const query: any = {
      ts: {
        $gte: filters.startDate,
        $lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
      },
    };

    if (filters.deviceId) {
      query.device = filters.deviceId;
    }

    const receipts = await Receipt.find(query)
      .sort({ ts: -1 })
      .exec();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Receipts');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Device', key: 'device', width: 10 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Membership Fee', key: 'membershipFee', width: 15 },
      { header: 'User Number', key: 'userNumber', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'IP', key: 'ip', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    receipts.forEach((receipt) => {
      worksheet.addRow({
        id: receipt._id.toString(),
        device: receipt.device,
        amount: receipt.amount,
        membershipFee: receipt.MembershipFee,
        userNumber: receipt.userNumber,
        location: receipt.location,
        ip: receipt.ip,
        status: receipt.Status,
        timestamp: receipt.ts.toISOString(),
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    logger.info('Receipts exported to Excel', {
      count: receipts.length,
      filters,
    });

    return Buffer.from(buffer);
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
}

// Export singleton instance
export const receiptService = new ReceiptService();
export { ReceiptService };
export default receiptService;

