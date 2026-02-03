import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { Loading } from '@/components/common/Loading';
import type { Device } from '@/types';

interface DeviceListProps {
  onDeviceClick?: (device: Device) => void;
}

export const DeviceList = ({ onDeviceClick }: DeviceListProps): JSX.Element => {
  const { devices, selectedDevice, isLoading, selectDevice } = useDevices();

  const handleDeviceClick = (device: Device): void => {
    if (onDeviceClick) {
      onDeviceClick(device);
    } else {
      // Default behavior: select device
      selectDevice(device.deviceId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" message="Loading devices..." />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
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
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No devices found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No devices are currently registered in the system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <DeviceCard
            key={device._id}
            device={device}
            onClick={handleDeviceClick}
            isSelected={selectedDevice === device.deviceId}
          />
        ))}
      </div>

      {/* Summary Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Total devices: <span className="font-medium">{devices.length}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              <span className="text-gray-700 dark:text-gray-300">
                Online: <span className="font-medium text-green-600 dark:text-green-400">
                  {devices.filter((d) => d.online).length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-gray-700 dark:text-gray-300">
                Offline: <span className="font-medium text-red-600 dark:text-red-400">
                  {devices.filter((d) => !d.online).length}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

