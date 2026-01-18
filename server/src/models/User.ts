import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from './types';

// Document interface extending IUser (without _id) and Mongoose Document
export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mongoose schema definition
const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      index: true,
    },
    salt: {
      type: String,
      required: true,
    },
    hashedPass: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      default: ['Admin'],
      enum: ['Admin', 'Super'],
    },
  },
  {
    timestamps: true, // Enables createdAt and updatedAt fields
  }
);

// Unique indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

// Pre-save hook: Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash password if it's new or has been modified
  if (!this.isModified('hashedPass')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds
    const salt = await bcrypt.genSalt(10);
    this.salt = salt;

    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(this.hashedPass, salt);
    this.hashedPass = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method: Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.hashedPass);
};

// Model interface
interface IUserModel extends Model<IUserDocument> {}

// Export the model
export const User: IUserModel = mongoose.model<IUserDocument, IUserModel>(
  'User',
  userSchema
);

