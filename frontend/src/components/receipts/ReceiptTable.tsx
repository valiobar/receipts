import { JSX } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useDevices } from '@/hooks/useDevices';
import { Loading } from '@/components/common/Loading';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/utils/date';
import type { Receipt } from '@/types';

interface ReceiptTableProps {
  onReceiptClick?: (receipt: Receipt) => void;
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
 * Format number as integer
 */
const formatInteger = (value: string | number): string => {
  try {
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) {
      return 'N/A';
    }
    return Math.floor(numValue).toString();
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Calculate used vouchers (initial - remaining)
 */
const calculateUsedVouchers = (receipt: Receipt): number | null => {
  if (receipt.user?.initialAmount !== undefined && receipt.user?.amount !== undefined) {
    return receipt.user.initialAmount - receipt.user.amount;
  }
  return null;
};

/**
 * Format user name as "J.Dow" (first initial + last name)
 */
const formatUserName = (receipt: Receipt): string => {
  if (receipt.user?.firstName && receipt.user?.lastName) {
    const firstInitial = receipt.user.firstName.charAt(0).toUpperCase();
    const lastName = receipt.user.lastName;
    return `${firstInitial}.${lastName}`;
  }
  return receipt.userNumber || 'N/A';
};

export const ReceiptTable = ({ onReceiptClick }: ReceiptTableProps): JSX.Element => {
  const { receipts, pagination, isLoading, fetchReceipts, filters } = useReceipts();
  const { devices } = useDevices();

  /**
   * Get device name from device ID
   */
  const getDeviceName = (deviceId: string): string => {
    const device = devices.find((d) => d.deviceId === deviceId);
    return device?.name || deviceId;
  };

  const handlePreviousPage = (): void => {
    if (pagination && pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      const newFilters = {
        ...filters,
        offset: newOffset,
      };
      fetchReceipts(newFilters);
    }
  };

  const handleNextPage = (): void => {
    if (pagination && pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit;
      const newFilters = {
        ...filters,
        offset: newOffset,
      };
      fetchReceipts(newFilters);
    }
  };

  const handlePageClick = (pageNumber: number): void => {
    if (pagination) {
      const newOffset = (pageNumber - 1) * pagination.limit;
      const newFilters = {
        ...filters,
        offset: newOffset,
      };
      fetchReceipts(newFilters);
    }
  };

  const getPageNumbers = (): number[] => {
    if (!pagination) {
      return [];
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    const pages: number[] = [];

    // Show up to 5 page numbers
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push(-1); // Ellipsis marker
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push(-1); // Ellipsis marker
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const handleRowClick = (receipt: Receipt): void => {
    if (onReceiptClick) {
      onReceiptClick(receipt);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" message="Loading receipts..." />
      </div>
    );
  }

  if (receipts.length === 0) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No receipts found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {pagination && pagination.total > 0
              ? 'Try adjusting your filters to see more results.'
              : 'No receipts match your current filters.'}
          </p>
        </div>
      </div>
    );
  }

  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const pageNumbers = getPageNumbers();
  const isClickable = Boolean(onReceiptClick);

  return (
    <div className="space-y-6">
      {/* Card View (visible on screens under 1280px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:hidden">
        {receipts.map((receipt) => (
          <div
            key={receipt._id}
            onClick={() => handleRowClick(receipt)}
            className={`
              bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4
              transition-colors duration-150
              ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
            `.trim()}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleRowClick(receipt);
              }
            }}
            aria-label={isClickable ? `View receipt ${receipt._id}` : undefined}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatAmount(receipt.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Timestamp</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {formatDate(receipt.ts, {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Device</div>
                <div className="text-gray-900 dark:text-white">
                  {getDeviceName(receipt.device)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Amount</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {formatAmount(receipt.amount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Customer Number</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {receipt.user?.customerNumber || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Remain Vouchers</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {receipt.user?.amount !== undefined
                    ? formatInteger(receipt.user.amount)
                    : formatInteger(receipt.MembershipFee)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Initial Vouchers</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {receipt.user?.initialAmount !== undefined
                    ? formatInteger(receipt.user.initialAmount)
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Used Vouchers</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {(() => {
                    const usedVouchers = calculateUsedVouchers(receipt);
                    return usedVouchers !== null ? formatInteger(usedVouchers) : 'N/A';
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Subscription Start</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {receipt.user?.subscriptionStartDate
                    ? formatDate(receipt.user.subscriptionStartDate, {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (visible on screens 1280px and above) */}
      <div className="hidden xl:block rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg">
          <table className="min-w-[1200px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32"
                >
                  Device
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Customer Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  User Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Remain Vouchers
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Initial Vouchers
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Used Vouchers
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Subscription Start
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {receipts.map((receipt) => (
                <tr
                  key={receipt._id}
                  onClick={() => handleRowClick(receipt)}
                  className={`
                    transition-colors duration-150
                    ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                  `.trim()}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleRowClick(receipt);
                    }
                  }}
                  aria-label={isClickable ? `View receipt ${receipt._id}` : undefined}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(receipt.ts, {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white w-40 max-w-40 truncate">
                    {getDeviceName(receipt.device)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                    {formatAmount(receipt.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {receipt.user?.customerNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatUserName(receipt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {receipt.user?.amount !== undefined
                      ? formatInteger(receipt.user.amount)
                      : formatInteger(receipt.MembershipFee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {receipt.user?.initialAmount !== undefined
                      ? formatInteger(receipt.user.initialAmount)
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {(() => {
                      const usedVouchers = calculateUsedVouchers(receipt);
                      return usedVouchers !== null ? formatInteger(usedVouchers) : 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {receipt.user?.subscriptionStartDate
                      ? formatDate(receipt.user.subscriptionStartDate, {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing{' '}
              <span className="font-medium">
                {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> receipts
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!pagination || pagination.offset === 0}
                data-testid="pagination-previous-button"
              >
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNum, index) => {
                  if (pageNum === -1) {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-gray-500 dark:text-gray-400"
                      >
                        ...
                      </span>
                    );
                  }

                  const isActive = pageNum === currentPage;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageClick(pageNum)}
                      className={`
                        min-w-[2.5rem] px-3 py-1.5 text-sm font-medium rounded-lg
                        transition-colors duration-200
                        ${
                          isActive
                            ? 'bg-primary-500 dark:bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `.trim()}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`pagination-page-${pageNum}-button`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination || !pagination.hasMore}
                data-testid="pagination-next-button"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

