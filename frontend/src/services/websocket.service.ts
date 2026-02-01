import { io, Socket } from 'socket.io-client';
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
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Connect to WebSocket server
   * @param token - Optional JWT token for authentication
   */
  connect(token?: string): void {
    // Disconnect existing connection if any
    if (this.socket?.connected) {
      this.disconnect();
    }

    const authToken = token || getToken();
    const wsUrl = WS_URL || (import.meta.env.DEV ? 'ws://localhost:3000' : '');

    // Build connection URL
    const url = wsUrl ? `${wsUrl}/client` : '/client';

    // Create socket connection with authentication
    this.socket = io(url, {
      transports: ['websocket'],
      auth: authToken ? { token: authToken } : undefined,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup all event handlers for the socket connection
   */
  private setupEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    // Connection established
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Disconnected
    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      
      // Attempt reconnection if not intentional
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    // Handle incoming messages
    // Note: Backend uses plain WebSocket, so we listen to 'message' event
    // Socket.IO might need custom handling - adjust based on actual backend implementation
    this.socket.on('message', (data: string | ClientMessage) => {
      this.handleMessage(data);
    });

    // Fallback: Handle raw data if Socket.IO receives it differently
    this.socket.onAny((eventName: string, data: unknown) => {
      if (eventName === 'message' || eventName === 'data') {
        this.handleMessage(data as string | ClientMessage);
      }
    });
  }

  /**
   * Handle incoming message and route to appropriate handler
   */
  private handleMessage(data: string | ClientMessage): void {
    let message: ClientMessage;

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

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    // Socket.IO handles reconnection automatically, but we track attempts
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    }
  }

  /**
   * Check if WebSocket is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current socket instance (for advanced usage)
   * @returns Socket instance or null
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();

