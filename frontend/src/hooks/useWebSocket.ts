import { useEffect, useRef } from 'react';
import { websocketService, WEBSOCKET_EVENTS } from '@/services/websocket.service';
import { useAuth } from './useAuth';
import { useReceipts } from './useReceipts';
import { useDevices } from './useDevices';
import type { ReceiptEvent, DeviceStatusEvent, NoPaperEvent } from '@/types';

/**
 * Hook to manage WebSocket connection and event handling
 * Automatically connects/disconnects based on authentication state
 * Updates contexts when WebSocket events are received
 */
export const useWebSocket = (): void => {
  const { isAuthenticated, token } = useAuth();
  const { addReceipt } = useReceipts();
  const { updateDeviceStatus, updateDeviceStatusField, devices } = useDevices();
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  useEffect(() => {
    // Handle receipt events
    const handleReceiptEvent = (event: CustomEvent<ReceiptEvent>): void => {
      const receiptEvent = event.detail;
      // Extract deviceId from location (format: "location/deviceId")
      const deviceId = receiptEvent.location.split('/').pop() || '';
      addReceipt(receiptEvent, deviceId);

      // Check if device status is not 'ready' and update it to 'ready' (use ref to avoid effect re-run)
      const currentDevices = devicesRef.current;
      const device = currentDevices.find((d) => d.location === deviceId);
      if (device && device.status !== 'ready') {
        updateDeviceStatusField(deviceId, 'ready');
      }
    };

    // Handle device status events
    const handleDeviceStatusEvent = (event: CustomEvent<DeviceStatusEvent>): void => {
      const statusEvent = event.detail;
      const deviceId = statusEvent.location.device;
      const isOnline = statusEvent.location.status;
      updateDeviceStatus(deviceId, isOnline);
    };

    // Handle no paper events
    const handleNoPaperEvent = (event: CustomEvent<NoPaperEvent>): void => {
      const noPaperEvent = event.detail;
      const deviceId = noPaperEvent.location.device;
      // Device is still online when no paper event occurs
      updateDeviceStatusField(deviceId, 'noPapper');
   
    };

    // Connect WebSocket when authenticated
    if (isAuthenticated && token) {
      websocketService.connect(token);

      // Setup event listeners (do not depend on devices so effect does not re-run on device updates and re-add listeners)
      window.addEventListener(WEBSOCKET_EVENTS.RECEIPT, handleReceiptEvent as EventListener);
      window.addEventListener(WEBSOCKET_EVENTS.DEVICE_STATUS, handleDeviceStatusEvent as EventListener);
      window.addEventListener(WEBSOCKET_EVENTS.NO_PAPER, handleNoPaperEvent as EventListener);
    } else {
      // Disconnect WebSocket when not authenticated
      websocketService.disconnect();
    }

    // Cleanup on unmount or when auth state changes
    return () => {
      window.removeEventListener(WEBSOCKET_EVENTS.RECEIPT, handleReceiptEvent as EventListener);
      window.removeEventListener(WEBSOCKET_EVENTS.DEVICE_STATUS, handleDeviceStatusEvent as EventListener);
      window.removeEventListener(WEBSOCKET_EVENTS.NO_PAPER, handleNoPaperEvent as EventListener);

      if (!isAuthenticated) {
        websocketService.disconnect();
      }
    };
  }, [isAuthenticated, token, addReceipt, updateDeviceStatus, updateDeviceStatusField]);
};

