import type { BRPSubscription } from '../types/brp-api';

// Command types enum
export enum CommandType {
  RECEIPT = 'receipt',
  DAILY_REPORT = 'dailyReport',
  MONTHLY_REPORT = 'monthlyReport',
  CUSTOM_CMD = 'customCmd',
}

// Command statuses enum
export enum CommandStatus {
  PENDING = 'pending',
  COMPLETE = 'complete',
  ERROR = 'error',
}

// Receipt statuses enum
export enum ReceiptStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
}

// Receipt interface
export interface IReceipt {
  _id?: string;
  device: string;
  amount: string;
  MembershipFee: string;
  userNumber: string;
  location: string;
  ip: string;
  Status: ReceiptStatus;
  ts: Date;
}

// Command interface
export interface ICommand {
  _id?: number;
  commandType: CommandType;
  deviceId: string;
  userNumber?: string;
  status: CommandStatus;
  amount?: string;
  membershipFee?: string;
  location?: string;
  webhookRequestIp?: string;
  clubReceiptN?: string;
  startDate?: Date;
  endDate?: Date;
  adminId?: string;
  customCmdId?: string;
  dataCmd?: string;
  tsProcessed?: Date;
  pulseClubSubscription?: BRPSubscription;
  ts: Date;
}

// Device interface
export interface IDevice {
  _id?: string;
  deviceId: string;
  name: string;
  location: string;
  status: boolean;
  lastSeen?: Date;
  devicePin?: string;
  metadata?: {
    firmwareVersion?: string;
    model?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// User interface
export interface IUser {
  _id?: string;
  email: string;
  username: string;
  salt: string;
  hashedPass: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

// BRP User interface
export interface IBRPUser {
  _id?: string;
  brpId: number;
  firstName: string;
  lastName: string;
  user?: string; // Optional user identifier or reference
  customerNumber: string;
  amount: number;
  tsCreated: Date;
}

