import mongoose, { Schema, Model, Document } from 'mongoose';
import { IBRPUser } from './types';

// Document interface extending IBRPUser (without _id) and Mongoose Document
export interface IBRPUserDocument extends Omit<IBRPUser, '_id'>, Document {}

// Mongoose schema definition
const brpUserSchema = new Schema<IBRPUserDocument>(
  {
    brpId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      // Optional user identifier or reference
    },
    customerNumber: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    initialAmount: {
      type: Number,
      required: true,
    },
    subscriptionStartDate: {
      type: Date,
      index: true,
    },
    tsCreated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true, // Enables createdAt and updatedAt fields
  }
);

// Indexes for performance
// Unique index for querying by brpId (enforced by unique: true in schema)
// Note: The unique constraint is already defined in the schema field definition above

// Index for querying by customerNumber
brpUserSchema.index({ customerNumber: 1 });

// Index for querying by creation timestamp
brpUserSchema.index({ tsCreated: -1 });

// Compound index for common queries
brpUserSchema.index({ customerNumber: 1, tsCreated: -1 });

// Model interface
interface IBRPUserModel extends Model<IBRPUserDocument> {}

// Export the model
export const BRPUser: IBRPUserModel = mongoose.model<IBRPUserDocument, IBRPUserModel>(
  'BRPUser',
  brpUserSchema
);

