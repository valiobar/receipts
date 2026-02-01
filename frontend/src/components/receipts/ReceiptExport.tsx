import { JSX, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { Button } from '@/components/common/Button';

interface ReceiptExportProps {
  format?: 'xlsx' | 'csv';
  className?: string;
}

export const ReceiptExport = ({ format = 'xlsx', className = '' }: ReceiptExportProps): JSX.Element => {
  const { filters, exportReceipts } = useReceipts();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async (): Promise<void> => {
    if (!filters.startDate || !filters.endDate) {
      // If no date range is set, use a default range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      try {
        setIsExporting(true);
        await exportReceipts({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          deviceId: filters.deviceId,
          format,
        });
      } catch (error) {
        console.error('Export failed:', error);
        // Error is already handled in the context
      } finally {
        setIsExporting(false);
      }
    } else {
      try {
        setIsExporting(true);
        await exportReceipts({
          startDate: filters.startDate,
          endDate: filters.endDate,
          deviceId: filters.deviceId,
          format,
        });
      } catch (error) {
        console.error('Export failed:', error);
        // Error is already handled in the context
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className={className}>
      <Button
        variant="primary"
        onClick={handleExport}
        isLoading={isExporting}
        disabled={isExporting}
        data-testid="export-receipts-button"
        aria-label={`Export receipts as ${format.toUpperCase()}`}
      >
        {isExporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
      </Button>
    </div>
  );
};

