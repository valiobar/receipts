import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';

/**
 * Card component displaying the count of online devices
 * Uses real-time data from the devices context
 */
export const OnlineDevicesCard = (): JSX.Element => {
  const { onlineDevices } = useDevices();
  const onlineCount = onlineDevices.size;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Online Devices</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {onlineCount}
          </p>
        </div>
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

