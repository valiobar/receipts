import { JSX, useEffect, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useDevices } from '@/hooks/useDevices';
import { apiService } from '@/services/api.service';
import { ReceiptCard } from '@/components/receipts/ReceiptCard';
import { Loading } from '@/components/common/Loading';
import { DevicesStatusList } from '@/components/devices/DevicesStatusList';
import { OnlineDevicesCard } from '@/components/devices/OnlineDevicesCard';
import { OfflineDevicesCard } from '@/components/devices/OfflineDevicesCard';
import { formatDate } from '@/utils/date';
import type { SystemStatusResponse } from '@/types';

export const Dashboard = (): JSX.Element => {
  const { receipts, pagination, fetchReceipts } = useReceipts();
  useDevices(); // Devices will be updated via WebSocket when client connects
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  // Fetch all receipts
  // Device statuses will be updated via WebSocket when client connects
  useEffect(() => {
    const loadAllReceipts = async (): Promise<void> => {
      await fetchReceipts({
        limit: 1000, // Large limit to fetch all receipts
        offset: 0,
      });
    };
    loadAllReceipts();
  }, [fetchReceipts]);

  // Fetch system status
  useEffect(() => {
    const loadSystemStatus = async (): Promise<void> => {
      setIsLoadingStatus(true);
      try {
        const response = await apiService.getSystemStatus();
        if (response.success && response.data) {
          setSystemStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadSystemStatus();
    // Poll for status updates every 2 minutes
    const interval = setInterval(loadSystemStatus, 120000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Overview of your receipt management system
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Receipts Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Receipts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {pagination?.total ?? receipts.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg
                className="h-6 w-6 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Online Devices Card */}
        <OnlineDevicesCard />

        {/* Offline Devices Card */}
        <OfflineDevicesCard />

        {/* Pending Commands Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Commands</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {systemStatus?.commands.pending ?? 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg
                className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Status Section */}
      <DevicesStatusList />

      {/* Recent Receipts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Receipts</h2>
        </div>

        {receipts.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No receipts yet</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Receipts will appear here as they are processed.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {receipts.slice(0, 5).map((receipt, index) => (
              <ReceiptCard key={`${receipt._id}-${index}`} receipt={receipt} />
            ))}
          </div>
        )}
      </div>

      {/* System Status Section */}
      {systemStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {systemStatus.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Database</p>
              <div className="flex items-center gap-2">
                <span
                  className={`
                    w-2 h-2 rounded-full
                    ${systemStatus.database.connected ? 'bg-green-500' : 'bg-red-500'}
                  `.trim()}
                  aria-label={systemStatus.database.connected ? 'Connected' : 'Disconnected'}
                />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemStatus.database.connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uptime</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.floor(systemStatus.uptime / 3600)}h{' '}
                {Math.floor((systemStatus.uptime % 3600) / 60)}m
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

