import { JSX, useState, FormEvent } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useDevices } from '@/hooks/useDevices';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { ReceiptFilters as ReceiptFiltersType } from '@/types';

interface ReceiptFiltersProps {
  onApply?: (filters: ReceiptFiltersType) => void;
  onReset?: () => void;
}

export const ReceiptFilters = ({ onApply, onReset }: ReceiptFiltersProps): JSX.Element => {
  const { filters, setFilters, fetchReceipts } = useReceipts();
  const { devices } = useDevices();

  const [localFilters, setLocalFilters] = useState<ReceiptFiltersType>({
    deviceId: filters.deviceId || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
    customerNumber: filters.customerNumber || '',
  });

  const handleInputChange = (field: keyof ReceiptFiltersType, value: string): void => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleApply = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    // Reset pagination when applying filters
    const newFilters: ReceiptFiltersType = {
      ...localFilters,
      offset: 0,
    };
    
    setFilters(newFilters);
    fetchReceipts(newFilters);
    
    if (onApply) {
      onApply(newFilters);
    }
  };

  const handleReset = (): void => {
    const emptyFilters: ReceiptFiltersType = {};
    setLocalFilters(emptyFilters);
    setFilters(emptyFilters);
    fetchReceipts(emptyFilters);
    
    if (onReset) {
      onReset();
    }
  };

  return (
    <form onSubmit={handleApply} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Device Filter */}
        <div>
          <label htmlFor="device-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Device
          </label>
          <select
            id="device-filter"
            value={localFilters.deviceId || ''}
            onChange={(e) => handleInputChange('deviceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
          >
            <option value="">All Devices</option>
            {devices.map((device) => (
              <option key={device._id} value={device.deviceId}>
                {device.name} ({device.location})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <Input
            id="start-date-filter"
            type="date"
            label="Start Date"
            value={localFilters.startDate || ''}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
          />
        </div>

        {/* End Date Filter */}
        <div>
          <Input
            id="end-date-filter"
            type="date"
            label="End Date"
            value={localFilters.endDate || ''}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
          />
        </div>

        {/* Customer Number Filter */}
        <div>
          <Input
            id="customer-number-filter"
            type="text"
            label="Customer Number"
            placeholder="Enter customer number"
            value={localFilters.customerNumber || ''}
            onChange={(e) => handleInputChange('customerNumber', e.target.value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={handleReset}
          data-testid="reset-filters-button"
        >
          Reset
        </Button>
        <Button
          type="submit"
          variant="primary"
          data-testid="apply-filters-button"
        >
          Apply Filters
        </Button>
      </div>
    </form>
  );
};

