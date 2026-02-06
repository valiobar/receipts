import { JSX } from 'react';
import type { Device } from '@/types';
import { formatDate, getRelativeTime } from '@/utils/date';
import { DeviceStatus } from './DeviceStatus';

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
          <DeviceStatus deviceId={device.deviceId} />
        </div>
     
      </div>

 
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

