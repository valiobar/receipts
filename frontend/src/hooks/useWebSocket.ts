import { useEffect, useRef } from 'react';
import { websocketService, WEBSOCKET_EVENTS } from '@/services/websocket.service';
import { useAuth } from './useAuth';
import { useReceipts } from './useReceipts';
import { useDevices } from './useDevices';
import type { ReceiptEvent, DeviceStatusEvent } from '@/types';

/**
 * Hook to manage WebSocket connection and event handling
 * Automatically connects/disconnects based on authentication state
 * Updates contexts when WebSocket events are received
 */
export const useWebSocket = (): void => {
  const { isAuthenticated, token } = useAuth();
  const { addReceipt } = useReceipts();
  const { updateDeviceStatus } = useDevices();
  const listenersSetupRef = useRef(false);

  useEffect(() => {
    // Handle receipt events
    const handleReceiptEvent = (event: CustomEvent<ReceiptEvent>): void => {
      const receiptEvent = event.detail;
      // Extract deviceId from location (format: "location/deviceId")
      const deviceId = receiptEvent.location.split('/').pop() || '';
      addReceipt(receiptEvent, deviceId);
    };

    // Handle device status events
    const handleDeviceStatusEvent = (event: CustomEvent<DeviceStatusEvent>): void => {
      const statusEvent = event.detail;
      const deviceId = statusEvent.location.device;
      const isOnline = statusEvent.location.status;
      updateDeviceStatus(deviceId, isOnline);
    };

    // Connect WebSocket when authenticated
    if (isAuthenticated && token) {
      websocketService.connect(token);

      // Setup event listeners
      window.addEventListener(WEBSOCKET_EVENTS.RECEIPT, handleReceiptEvent as EventListener);
      window.addEventListener(WEBSOCKET_EVENTS.DEVICE_STATUS, handleDeviceStatusEvent as EventListener);
      listenersSetupRef.current = true;
    } else {
      // Disconnect WebSocket when not authenticated
      websocketService.disconnect();
      listenersSetupRef.current = false;
    }

    // Cleanup on unmount or when auth state changes
    return () => {
      window.removeEventListener(WEBSOCKET_EVENTS.RECEIPT, handleReceiptEvent as EventListener);
      window.removeEventListener(WEBSOCKET_EVENTS.DEVICE_STATUS, handleDeviceStatusEvent as EventListener);
      
      if (!isAuthenticated) {
        websocketService.disconnect();
        listenersSetupRef.current = false;
      }
    };
  }, [isAuthenticated, token, addReceipt, updateDeviceStatus]);
};

