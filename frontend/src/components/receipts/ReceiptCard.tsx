import { JSX } from 'react';
import type { Receipt } from '@/types';
import { formatDate } from '@/utils/date';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick?: (receipt: Receipt) => void;
}

/**
 * Format amount as currency
 */
const formatAmount = (amount: string): string => {
  try {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return amount;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    return amount;
  }
};

/**
 * Get status badge styling
 */
const getStatusBadgeClasses = (status: Receipt['Status']): string => {
  return status === 'processed'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
};

export const ReceiptCard = ({ receipt, onClick }: ReceiptCardProps): JSX.Element => {
  const handleClick = (): void => {
    if (onClick) {
      onClick(receipt);
    }
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3
        transition-all duration-200 flex flex-col
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
      aria-label={isClickable ? `View receipt ${receipt._id}` : undefined}
    >
      {/* Amount - Prominent */}
      <div className="mb-2">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(receipt.amount)}</p>
      </div>

      {/* Compact info list */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-start justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
          <span className="text-gray-900 dark:text-white font-medium text-right ml-2">
            {formatDate(receipt.ts, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-start justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">User:</span>
          <span className="text-gray-900 dark:text-white font-medium text-right ml-2" title={receipt.user ? `${receipt.user.firstName} ${receipt.user.lastName}` : undefined}>
            {receipt.user?.customerNumber || receipt.userNumber || 'N/A'}
          </span>
        </div>

        <div className="flex items-start justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Location:</span>
          <span className="text-gray-900 dark:text-white font-medium text-right ml-2 truncate" title={receipt.location}>
            {receipt.location || 'N/A'}
          </span>
        </div>

        <div className="flex items-start justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Device ID:</span>
          <span className="text-gray-900 dark:text-white font-medium text-right ml-2 truncate" title={receipt.device}>
            {receipt.device || 'N/A'}
          </span>
        </div>
      </div>

      {/* Status badge at bottom */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <span
          className={`
            inline-block px-2 py-0.5 rounded text-xs font-medium border
            ${getStatusBadgeClasses(receipt.Status)}
          `.trim()}
        >
          {receipt.Status}
        </span>
      </div>
    </div>
  );
};

