import { getToken } from '@/utils/token';
import { WS_URL } from '@/utils/constants';
import type {
  ReceiptEvent,
  DeviceStatusEvent,
  NoPaperEvent,
  SpadNaprejenieEvent,
  InfoEvent,
  ClientMessage,
} from '@/types';

/**
 * Custom event names for dispatching to components
 */
export const WEBSOCKET_EVENTS = {
  RECEIPT: 'receipt-event',
  DEVICE_STATUS: 'device-status-event',
  NO_PAPER: 'no-paper-event',
  SPAD_NAPREJENIE: 'spad-naprejenie-event',
} as const;

/**
 * WebSocket service for managing real-time connection to backend
 * Handles connection, reconnection, and message routing
 * Uses native WebSocket API (not Socket.IO) to match server implementation
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;

  /**
   * Connect to WebSocket server
   * @param token - Optional JWT token for authentication
   */
  connect(token?: string): void {
    // Disconnect existing connection if any
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    // Clear any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const authToken = token || getToken() || undefined;
    const wsUrl = WS_URL || (import.meta.env.DEV ? 'ws://localhost:3001' : '');

    // Build connection URL
    // WS_URL is already in ws:// or wss:// format, or empty for relative URL
    let url: string;
    if (wsUrl) {
      // Use the provided WS_URL directly and append /client path
      url = `${wsUrl}/client`;
    } else {
      // Relative URL - use current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${protocol}//${window.location.host}/client`;
    }

    // Add token as query parameter if provided (server may use this for auth)
    if (authToken) {
      url += `?token=${encodeURIComponent(authToken)}`;
    }

    console.log('Connecting to WebSocket:', url);

    try {
      this.socket = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnection();
    }
  }

  /**
   * Setup all event handlers for the socket connection
   */
  private setupEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    // Connection established
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
    };

    // Connection error
    this.socket.onerror = (error: Event) => {
      console.error('WebSocket connection error:', error);
      // onerror is called before onclose, so we'll handle reconnection in onclose
    };

    // Disconnected
    this.socket.onclose = (event: CloseEvent) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Attempt reconnection if not intentional and not a normal closure
      if (!this.isIntentionalDisconnect && event.code !== 1000) {
        this.handleReconnection();
      } else {
        this.isIntentionalDisconnect = false;
      }
    };

    // Handle incoming messages
    this.socket.onmessage = (event: MessageEvent) => {
      // WebSocket messages can be string or Blob/ArrayBuffer
      // Our server sends JSON strings
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      this.handleMessage(data);
    };
  }

  /**
   * Handle incoming message and route to appropriate handler
   */
  private handleMessage(data: string | ClientMessage): void {
    let message: ClientMessage;
   
    console.log('Received WebSocket message:', data);
    
    // Parse if string, otherwise use as-is
    if (typeof data === 'string') {
      try {
        message = JSON.parse(data) as ClientMessage;
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        return;
      }
    } else {
      message = data;
    }

    // Route message based on type
    // Receipt events: Check for action === 'print' (no type wrapper)
    if ('action' in message && message.action === 'print') {
      this.handleReceiptEvent(message as ReceiptEvent);
      return;
    }

    // Device status events: Check for type === 'connect'
    if ('type' in message && message.type === 'connect') {
      this.handleDeviceStatusEvent(message as DeviceStatusEvent);
      return;
    }

    // No paper events: Check for type === 'noPaper'
    if ('type' in message && message.type === 'noPaper') {
      this.handleNoPaperEvent(message as NoPaperEvent);
      return;
    }

    // Spad naprejenie events: Check for type === 'spad-naprejenie'
    if ('type' in message && message.type === 'spad-naprejenie') {
      this.handleSpadNaprejenieEvent(message as SpadNaprejenieEvent);
      return;
    }

    // Info messages: Check for type === 'info' (log to console)
    if ('type' in message && message.type === 'info') {
      this.handleInfoEvent(message as InfoEvent);
      return;
    }

    // Unknown message type
    console.warn('Unknown WebSocket message type:', message);
  }

  /**
   * Handle receipt event
   */
  private handleReceiptEvent(event: ReceiptEvent): void {
    // Dispatch custom event for components
    window.dispatchEvent(
      new CustomEvent(WEBSOCKET_EVENTS.RECEIPT, {
        detail: event,
      })
    );
  }

  /**
   * Handle device status event
   */
  private handleDeviceStatusEvent(event: DeviceStatusEvent): void {
    // Dispatch custom event for components
    window.dispatchEvent(
      new CustomEvent(WEBSOCKET_EVENTS.DEVICE_STATUS, {
        detail: event,
      })
    );
  }

  /**
   * Handle no paper event
   */
  private handleNoPaperEvent(event: NoPaperEvent): void {
    // Dispatch custom event for components
    window.dispatchEvent(
      new CustomEvent(WEBSOCKET_EVENTS.NO_PAPER, {
        detail: event,
      })
    );
  }

  /**
   * Handle spad naprejenie (voltage drop) event
   */
  private handleSpadNaprejenieEvent(event: SpadNaprejenieEvent): void {
    // Dispatch custom event for components
    window.dispatchEvent(
      new CustomEvent(WEBSOCKET_EVENTS.SPAD_NAPREJENIE, {
        detail: event,
      })
    );
  }

  /**
   * Handle info event (log to console)
   */
  private handleInfoEvent(event: InfoEvent): void {
    console.log('WebSocket info:', event.message);
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000); // Max 10 seconds

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Get token again in case it was refreshed
      const token = getToken() || undefined;
      this.connect(token);
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionalDisconnect = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect'); // Normal closure
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  /**
   * Check if WebSocket is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current socket instance (for advanced usage)
   * @returns WebSocket instance or null
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();
