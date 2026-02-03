import { JSX } from 'react';
import type { Device } from '@/types';
import { formatDate, getRelativeTime } from '@/utils/date';

interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
  isSelected?: boolean;
}

/**
 * Get status badge styling based on online status
 */
const getStatusBadgeClasses = (isOnline: boolean): string => {
  return isOnline
    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
};

/**
 * Get status indicator dot styling
 */
const getStatusDotClasses = (isOnline: boolean): string => {
  return isOnline
    ? 'bg-green-500'
    : 'bg-red-500';
};

export const DeviceCard = ({ device, onClick, isSelected = false }: DeviceCardProps): JSX.Element => {
  const handleClick = (): void => {
    if (onClick) {
      onClick(device);
    }
  };

  const isClickable = Boolean(onClick);
  const isOnline = device.online;

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6
        transition-all duration-200
        ${isSelected ? 'border-primary-500 dark:border-primary-600 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-200 dark:border-gray-700'}
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600' : ''}
      `.trim()}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={isClickable ? `Select device ${device.name}` : undefined}
      aria-selected={isClickable ? isSelected : undefined}
    >
      {/* Header row - Device name and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {device.name || 'Unnamed Device'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PIN: {device.devicePin || 'N/A'}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-medium border
              ${getStatusBadgeClasses(isOnline)}
            `.trim()}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`
                w-2 h-2 rounded-full
                ${getStatusDotClasses(isOnline)}
              `.trim()}
              aria-label={isOnline ? 'Device is online' : 'Device is offline'}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isOnline ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{device.location || 'N/A'}</p>
      </div>

      {/* Details grid */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {device.status ? 'Enabled' : 'Disabled'}
        </p>
      </div>

      {/* Last seen timestamp */}
      {device.lastSeen && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last seen: {getRelativeTime(device.lastSeen)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatDate(device.lastSeen, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}

      {/* Metadata (if available) */}
      {device.metadata && (device.metadata.firmwareVersion || device.metadata.model) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            {device.metadata.firmwareVersion && (
              <span>Firmware: {device.metadata.firmwareVersion}</span>
            )}
            {device.metadata.model && (
              <span>Model: {device.metadata.model}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

