import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { DeviceList } from '@/components/devices/DeviceList';
import { DeviceStatus } from '@/components/devices/DeviceStatus';
import { DeviceCommand } from '@/components/devices/DeviceCommand';

export const Devices = (): JSX.Element => {
  const { selectedDevice } = useDevices(); // Automatically fetches devices if needed

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devices</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Monitor device status and send commands
        </p>
      </div>

      {/* Device List */}
      <DeviceList />

      {/* Device Details Section - Only show when device is selected */}
      {selectedDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Status */}
          <DeviceStatus deviceId={selectedDevice} />

          {/* Device Command */}
          <DeviceCommand deviceId={selectedDevice} />
        </div>
      )}

      {/* No Device Selected Message */}
      {!selectedDevice && (
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
              Select a device from the list above to view its status and send commands.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

