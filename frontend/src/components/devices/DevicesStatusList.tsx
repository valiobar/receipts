import { JSX } from 'react';
import { useDevices } from '@/hooks/useDevices';

export const DevicesStatusList = (): JSX.Element => {
  const { devices } = useDevices();

  const getStatusIcon = (
    isOnline: boolean,
    statusText: string
  ): { icon: JSX.Element; color: string; bgColor: string; borderColor: string } => {
    const isNoPaper = statusText === 'noPapper';
    const isReady = statusText === 'ready' && isOnline;

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
        color: 'text-orange-500 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
      };
    }

    if (isOnline && isReady) {
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
        color: 'text-green-500 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
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
      color: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Devices Status</h2>
      {devices.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">No devices found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {devices.slice(0, 12).map((device) => {
            const isOnline = device.online ?? false;
            const statusText = device.status ?? 'offline';
            const isNoPaper = statusText === 'noPapper';
            const isReady = statusText === 'ready' && isOnline;

            const statusIcon = getStatusIcon(isOnline, statusText);
            const statusLabel = isNoPaper ? 'No Paper' : isReady ? 'Ready' : 'Offline';

            return (
              <div
                key={device._id}
                className={`
                  rounded-lg border p-4 transition-all duration-200
                  ${statusIcon.bgColor} ${statusIcon.borderColor}
                `.trim()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {device.name || 'Unnamed Device'}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize">
                      {statusLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span
                      className={`
                        w-2 h-2 rounded-full
                        ${isNoPaper ? 'bg-orange-500' : isOnline && isReady ? 'bg-green-500' : 'bg-red-500'}
                      `.trim()}
                      aria-label={statusLabel}
                    />
                    <span className={statusIcon.color} aria-label={statusLabel}>
                      {statusIcon.icon}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

