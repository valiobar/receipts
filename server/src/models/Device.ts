import mongoose, { Schema, Model, Document } from 'mongoose';
import { IDevice } from './types';

// Document interface extending IDevice (without _id) and Mongoose Document
export interface IDeviceDocument extends Omit<IDevice, '_id'>, Document {}

// Mongoose schema definition
const deviceSchema = new Schema<IDeviceDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
    },
    devicePin: {
      type: String,
      default: '1234',
    },
    metadata: {
      firmwareVersion: {
        type: String,
      },
      model: {
        type: String,
      },
    },
  },
  {
    timestamps: true, // Enables createdAt and updatedAt fields
  }
);

// Explicit unique index on deviceId (also defined in schema, but explicit for clarity)
deviceSchema.index({ deviceId: 1 }, { unique: true });

// Model interface
interface IDeviceModel extends Model<IDeviceDocument> {}

// Export the model
export const Device: IDeviceModel = mongoose.model<IDeviceDocument, IDeviceModel>(
  'Device',
  deviceSchema
);

