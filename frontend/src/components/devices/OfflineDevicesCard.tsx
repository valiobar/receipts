import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';

/**
 * Card component displaying the count of offline devices
 * Uses real-time data from the devices context
 */
export const OfflineDevicesCard = (): JSX.Element => {
  const { devices, onlineDevices } = useDevices();
  const onlineCount = onlineDevices.size;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offline Devices</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {offlineCount}
          </p>
        </div>
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

