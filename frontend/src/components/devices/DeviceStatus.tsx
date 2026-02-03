import { JSX, useEffect, useState } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { apiService } from '@/services/api.service';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/utils/date';
import type { DeviceStatusResponse } from '@/types';

interface DeviceStatusProps {
  deviceId: string | null;
}

export const DeviceStatus = ({ deviceId }: DeviceStatusProps): JSX.Element => {
  const { devices } = useDevices();
  const [status, setStatus] = useState<DeviceStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const device = devices.find((d) => d.deviceId === deviceId);

  useEffect(() => {
    if (!deviceId) {
      setStatus(null);
      setError(null);
      return;
    }

    const fetchStatus = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.getDeviceStatus(deviceId);
        if (response.success && response.data) {
          setStatus(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch device status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch device status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [deviceId]);

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

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loading size="md" message="Loading device status..." />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading status</h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = status?.online ?? device?.online ?? false;
  const statusText = status?.status ?? 'unknown';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Status</h2>
        <div className="flex items-center gap-2">
          <span
            className={`
              w-3 h-3 rounded-full
              ${isOnline ? 'bg-green-500' : 'bg-red-500'}
            `.trim()}
            aria-label={isOnline ? 'Device is online' : 'Device is offline'}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isOnline ? 'Online' : 'Offline'}
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
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {status?.pendingCommands ?? 0}
            </p>
          </div>
        </div>

        {/* Last Seen */}
        {status?.lastSeen && (
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Seen</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(status.lastSeen, {
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

        {/* Last Command */}
        {status?.lastCommand && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Last Command</p>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Type: <span className="font-normal capitalize">{status.lastCommand.type}</span>
                </span>
                <span
                  className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${
                      status.lastCommand.status === 'complete'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : status.lastCommand.status === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }
                  `.trim()}
                >
                  {status.lastCommand.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ID: {status.lastCommand.id} |{' '}
                {formatDate(status.lastCommand.timestamp, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        )}

        {/* No Last Command */}
        {!status?.lastCommand && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No command history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

