export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  location: string;
  status: boolean;
  online: boolean;
  lastSeen?: string;
  devicePin?: string;
  metadata?: {
    firmwareVersion?: string;
    model?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceCommand {
  type: 'daily' | 'period' | 'cmd' | 'daily-X' | 'spad-naprejenie';
  startDate?: string;
  endDate?: string;
  commandId?: string;
  data?: string;
}

