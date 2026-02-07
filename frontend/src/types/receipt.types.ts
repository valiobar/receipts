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
  user?: {
    brpId: number;
    firstName: string;
    lastName: string;
    customerNumber: string;
    amount: number;
    initialAmount: number;
    subscriptionStartDate?: string;
    tsCreated: string;
  } | null;
}

export interface ReceiptFilters {
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  customerNumber?: string;
  status?: 'pending' | 'processed';
  limit?: number;
  offset?: number;
}




