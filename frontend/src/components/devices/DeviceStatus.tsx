import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { formatDate } from '@/utils/date';

interface DeviceStatusProps {
  deviceId: string | null;
}

export const DeviceStatus = ({ deviceId }: DeviceStatusProps): JSX.Element => {
  const { devices } = useDevices();
 
  const device = devices.find((d) => d.deviceId === deviceId);
  if (!deviceId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No device selected</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Select a device from the list to view its status.
          </p>
        </div>
      </div>
    );
  }

  const isOnline = device?.online ?? false;
  const statusText = device?.status ?? 'unknown';
  const isNoPaper = statusText === 'noPapper';

  // Determine which icon and color to show
  const getStatusIcon = (): { icon: JSX.Element; label: string; color: string } => {
    if (isNoPaper) {
      return {
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
        ),
        label: 'No Paper',
        color: 'text-orange-500 dark:text-orange-400',
      };
    }

    if (isOnline) {
      return {
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: 'Online',
        color: 'text-green-500 dark:text-green-400',
      };
    }

    return {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: 'Offline',
      color: 'text-red-500 dark:text-red-400',
    };
  };

  const statusIcon = getStatusIcon();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Status</h2>
        <div className="flex items-center gap-2">
          <span
            className={`
              w-3 h-3 rounded-full
              ${isNoPaper ? 'bg-orange-500' : isOnline ? 'bg-green-500' : 'bg-red-500'}
            `.trim()}
            aria-label={statusIcon.label}
          />
          <span className={statusIcon.color} aria-label={statusIcon.label}>
            {statusIcon.icon}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Device Info */}
        {device && (
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Device Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{device.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{device.location || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{statusText}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Commands</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">0</p>
          </div>
        </div>

        {/* Last Seen */}
        {device?.lastSeen && (
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Seen</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(device?.lastSeen ?? '', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>
        )}

     
      </div>
    </div>
  );
};

