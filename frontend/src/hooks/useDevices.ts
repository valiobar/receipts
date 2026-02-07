import { useContext, useEffect } from 'react';
import { DevicesContext } from '@/store/devices.context';

/**
 * Hook to access devices context
 * Automatically fetches devices if not already loaded
 * @returns Devices context value
 * @throws Error if used outside DevicesProvider
 */
export const useDevices = () => {
  const context = useContext(DevicesContext);
  if (!context) {
    throw new Error('useDevices must be used within DevicesProvider');
  }

  const { devices, fetchDevices, isLoading } = context;

  // Automatically fetch devices on mount if not already loaded
  useEffect(() => {
    if (devices.length === 0 && !isLoading) {
      fetchDevices();
    }
  }, [devices.length, isLoading, fetchDevices]);

  return context;
};

