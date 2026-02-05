import { JSX } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { ReceiptCard } from '@/components/receipts/ReceiptCard';
import { Loading } from '@/components/common/Loading';
import { Button } from '@/components/common/Button';
import type { Receipt } from '@/types';

interface ReceiptListProps {
  onReceiptClick?: (receipt: Receipt) => void;
}

export const ReceiptList = ({ onReceiptClick }: ReceiptListProps): JSX.Element => {
  const { receipts, pagination, isLoading, fetchReceipts, filters } = useReceipts();

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

  return (
    <div className="space-y-6">
      {/* Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receipts.map((receipt) => (
          <ReceiptCard
            key={receipt._id}
            receipt={receipt}
            onClick={onReceiptClick}
          />
        ))}
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

