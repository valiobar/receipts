import { JSX, useEffect } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { ReceiptFilters } from '@/components/receipts/ReceiptFilters';
import { ReceiptTable } from '@/components/receipts/ReceiptTable';
import { ReceiptExport } from '@/components/receipts/ReceiptExport';

export const Receipts = (): JSX.Element => {
  const { filters, fetchReceipts } = useReceipts();

  // Fetch receipts on mount and when filters change
  useEffect(() => {
    fetchReceipts(filters);
  }, [fetchReceipts, filters]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage all receipts in the system
          </p>
        </div>
        <ReceiptExport format="xlsx" />
      </div>

      {/* Filters */}
      <ReceiptFilters />

      {/* Receipt Table */}
      <ReceiptTable />
    </div>
  );
};

