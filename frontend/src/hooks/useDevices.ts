import { useContext } from 'react';
import { DevicesContext } from '@/store/devices.context';

/**
 * Hook to access devices context
 * @returns Devices context value
 * @throws Error if used outside DevicesProvider
 */
export const useDevices = () => {
  const context = useContext(DevicesContext);
  if (!context) {
    throw new Error('useDevices must be used within DevicesProvider');
  }
  return context;
};

