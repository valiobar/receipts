export interface Receipt {
  _id: string;
  device: string;
  amount: string;
  MembershipFee: string;
  userNumber: string;
  location: string;
  ip: string;
  Status: 'pending' | 'processed';
  ts: string;
}

export interface ReceiptFilters {
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  userNumber?: string;
  status?: 'pending' | 'processed';
  limit?: number;
  offset?: number;
}



