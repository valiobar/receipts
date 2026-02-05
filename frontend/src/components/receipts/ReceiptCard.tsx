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
        bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6
        transition-all duration-200
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
      {/* Header row - Receipt number and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Receipt #{receipt._id.slice(-8)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {receipt._id}</p>
        </div>
        <span
          className={`
            px-3 py-1 rounded-full text-xs font-medium border
            ${getStatusBadgeClasses(receipt.Status)}
          `.trim()}
        >
          {receipt.Status}
        </span>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(receipt.amount)}</p>
        {receipt.MembershipFee && parseFloat(receipt.MembershipFee) > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Membership Fee: {formatAmount(receipt.MembershipFee)}
          </p>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User Number</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.userNumber || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.location || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Device</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.device || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">IP Address</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.ip || 'N/A'}</p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(receipt.ts, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

