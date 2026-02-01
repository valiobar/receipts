import mongoose, { Schema, Model, Document } from 'mongoose';

// Counter document interface
export interface ICounterDocument extends Document {
  _id: string;
  seq: number;
}

// Counter schema definition
const counterSchema = new Schema<ICounterDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

// Static method: Get next sequence number atomically
counterSchema.statics.getNextSequence = async function (
  sequenceName: string
): Promise<number> {
  const result = await this.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

// Model interface extending Model with static methods
interface ICounterModel extends Model<ICounterDocument> {
  getNextSequence(sequenceName: string): Promise<number>;
}

// Export the model
export const Counter: ICounterModel = mongoose.model<
  ICounterDocument,
  ICounterModel
>('Counter', counterSchema);

