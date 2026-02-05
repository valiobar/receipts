// Receipt event (no type wrapper, sent directly)
export interface ReceiptEvent {
  MessageId: number;
  UnicSaleNum: string;
  action: 'print';
  price: string;
  user: string;
  location: string;
}

// Device status event
export interface DeviceStatusEvent {
  type: 'connect';
  location: {
    name: string;
    device: string;
    status: boolean; // true = online, false = offline
  };
}

// No paper event
export interface NoPaperEvent {
  type: 'noPaper';
  location: {
    name: string;
    device: string;
    status: boolean; // Always true (device still online)
  };
}

// Spad naprejenie (voltage drop) event
export interface SpadNaprejenieEvent {
  type: 'spad-naprejenie';
  location: {
    name: string;
    device: string;
    status: boolean; // Always true (device still online)
  };
}

// Info message (connection confirmation)
export interface InfoEvent {
  type: 'info';
  message: string;
}

// Union type for all client messages
export type ClientMessage = ReceiptEvent | DeviceStatusEvent | NoPaperEvent | SpadNaprejenieEvent | InfoEvent;


