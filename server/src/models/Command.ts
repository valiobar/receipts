import mongoose, { Schema, Model, Document } from 'mongoose';
import { ICommand, CommandType, CommandStatus } from './types';
import { Counter } from './Counter';

// Document interface extending ICommand (without _id) and Mongoose Document
export interface ICommandDocument extends Omit<ICommand, '_id'>, Document {}

// Mongoose schema definition
const commandSchema = new Schema<ICommandDocument>(
  {
    _id: {
      type: Number,
    },
    commandType: {
      type: String,
      enum: Object.values(CommandType),
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    userNumber: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(CommandStatus),
      default: CommandStatus.PENDING,
      index: true,
    },
    amount: {
      type: String,
    },
    membershipFee: {
      type: String,
    },
    location: {
      type: String,
    },
    webhookRequestIp: {
      type: String,
    },
    clubReceiptN: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customCmdId: {
      type: String,
    },
    dataCmd: {
      type: String,
    },
    tsProcessed: {
      type: Date,
    },
    pulseClubSubscription: {
      type: Schema.Types.Mixed, // Store as flexible object
      required: false,
    },
    ts: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Using custom ts field instead of createdAt/updatedAt
  }
);

// Compound indexes for performance
// Index for querying pending commands by device, sorted by timestamp
commandSchema.index({ deviceId: 1, status: 1, ts: 1 });

// Index for querying commands by type, sorted by timestamp
commandSchema.index({ commandType: 1, ts: -1 });

// Index for general timestamp-based queries
commandSchema.index({ ts: -1 });

// Pre-save hook: Auto-increment _id if not set
commandSchema.pre('save', async function (next) {
  // Only set _id if it's not already set
  if (!this._id) {
    try {
      this._id = await Counter.getNextSequence('commandId');
    } catch (error) {
      // Log error but don't block save operation
      console.error('Error auto-incrementing command _id:', error);
    }
  }
  next();
});

// Pre-save hook: Calculate clubReceiptN for receipt commands
commandSchema.pre('save', async function (next) {
  // Only calculate if this is a receipt command and clubReceiptN is not already set
  if (this.commandType === CommandType.RECEIPT && !this.clubReceiptN) {
    try {
      // Count existing commands for this device to get next receipt number
      // Access model at runtime (after it's registered) to avoid circular reference
      const CommandModel = mongoose.models.Command as Model<ICommandDocument>;
      if (CommandModel) {
        const count = await CommandModel.countDocuments({ deviceId: this.deviceId, status: CommandStatus.COMPLETE });
        // Set clubReceiptN to count + 1 (as string)
        this.clubReceiptN = (count + 1).toString();
      }
    } catch (error) {
      // Log error but don't block save operation
      console.error('Error calculating clubReceiptN:', error);
    }
  }
  next();
});

// Static method: Get last receipt command for a device
commandSchema.statics.getLastReceipt = async function (
  deviceId: string
): Promise<ICommandDocument | null> {
  return this.findOne({
    commandType: CommandType.RECEIPT,
    deviceId: deviceId,
  })
    .sort({ ts: -1 })
    .exec();
};

// Static method: Get pending command for a device
commandSchema.statics.getPending = async function (
  deviceId: string
): Promise<ICommandDocument | null> {
  return this.findOne({
    deviceId: deviceId,
    status: CommandStatus.PENDING,
  })
    .sort({ ts: 1 })
    .exec();
};

// Static method: Get receipt commands for a date period
commandSchema.statics.getReceiptsForPeriod = async function (
  startDate: Date,
  endDate: Date
): Promise<ICommandDocument[]> {
  return this.find({
    commandType: CommandType.RECEIPT,
    ts: { $gt: startDate, $lt: endDate },
  })
    .select('ts location userNumber amount')
    .sort({ ts: -1 })
    .exec();
};

// Static method: Change command status (complete or error)
commandSchema.statics.changeStatus = async function (
  id: number,
  isError: boolean = false
): Promise<ICommandDocument | null> {
  const command = await this.findById(id);
  if (!command) {
    return null;
  }
  // Set status based on isError flag
  // Only update if command is in PROCESSING status (to prevent updating already completed commands)
  if (command.status === CommandStatus.PROCESSING) {
    command.status = isError ? CommandStatus.PENDING : CommandStatus.COMPLETE;
    command.tsProcessed = new Date();
    return command.save();
  }
  // If not processing, return as-is (may be called for retry scenarios)
  return command;
};

// Static method: Set command status to processing
commandSchema.statics.setProcessing = async function (
  id: number
): Promise<ICommandDocument | null> {
  const command = await this.findById(id);
  if (!command) {
    return null;
  }
  // Only set to processing if currently pending
  if (command.status === CommandStatus.PENDING) {
    command.status = CommandStatus.PROCESSING;
    return command.save();
  }
  return command;
};

// Model interface extending Model with static methods
interface ICommandModel extends Model<ICommandDocument> {
  getLastReceipt(deviceId: string): Promise<ICommandDocument | null>;
  getPending(deviceId: string): Promise<ICommandDocument | null>;
  getReceiptsForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<ICommandDocument[]>;
  changeStatus(id: number, isError?: boolean): Promise<ICommandDocument | null>;
  setProcessing(id: number): Promise<ICommandDocument | null>;
}

// Export the model (must be after schema definition for pre-save hook reference)
export const Command: ICommandModel = mongoose.model<
  ICommandDocument,
  ICommandModel
>('Command', commandSchema);

