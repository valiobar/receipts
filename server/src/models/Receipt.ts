import mongoose, { Schema, Model, Document } from 'mongoose';
import { IReceipt, ReceiptStatus } from './types';
import { BRPUser } from './BRPUser';

// Document interface extending IReceipt (without _id) and Mongoose Document
export interface IReceiptDocument extends Omit<IReceipt, '_id'>, Document {}

// Mongoose schema definition
const receiptSchema = new Schema<IReceiptDocument>(
  {
    device: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
    },
    MembershipFee: {
      type: String,
      required: true,
    },
    userNumber: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    Status: {
      type: String,
      enum: Object.values(ReceiptStatus),
      default: ReceiptStatus.PENDING,
      index: true,
    },
    ts: {
      type: Date,
      default: Date.now,
      index: true,
    },
    brpUserId: {
      type: Schema.Types.ObjectId,
      ref: 'BRPUser',
      index: true,
    },
  },
  {
    timestamps: false, // Using custom ts field instead of createdAt/updatedAt
  }
);

// Compound indexes for performance
// Index for querying receipts by device, sorted by timestamp (descending)
receiptSchema.index({ device: 1, ts: -1 });

// Index for querying pending receipts by device
receiptSchema.index({ Status: 1, device: 1 });

// Index for general timestamp-based queries
receiptSchema.index({ ts: -1 });

// Index for querying receipts by brpUserId
receiptSchema.index({ brpUserId: 1 });

// Static method: Get last receipt for a device
receiptSchema.statics.getLastReceipt = async function (
  deviceId: string
): Promise<IReceiptDocument | null> {
  return this.findOne({ device: deviceId }).sort({ ts: -1 }).exec();
};

// Static method: Get pending receipt for a device
receiptSchema.statics.getPending = async function (
  deviceId: string
): Promise<IReceiptDocument | null> {
  return this.findOne({ device: deviceId, Status: ReceiptStatus.PENDING })
    .sort({ ts: 1 })
    .exec();
};

// Static method: Change receipt status to processed
receiptSchema.statics.changeStatus = async function (
  id: string
): Promise<IReceiptDocument | null> {
  const receipt = await this.findById(id);
  if (!receipt) {
    return null;
  }
  receipt.Status = ReceiptStatus.PROCESSED;
  return receipt.save();
};

// Model interface extending Model with static methods
interface IReceiptModel extends Model<IReceiptDocument> {
  getLastReceipt(deviceId: string): Promise<IReceiptDocument | null>;
  getPending(deviceId: string): Promise<IReceiptDocument | null>;
  changeStatus(id: string): Promise<IReceiptDocument | null>;
}

// Export the model
export const Receipt: IReceiptModel = mongoose.model<IReceiptDocument, IReceiptModel>(
  'Receipt',
  receiptSchema
);

