import { JSX, useState, FormEvent } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { formatDateInput } from '@/utils/date';
import type { DeviceCommand as DeviceCommandType } from '@/types';

interface DeviceCommandProps {
  deviceId: string | null;
}

type CommandType = 'daily' | 'period' | 'cmd' | 'daily-X' | 'spad-naprejenie';

export const DeviceCommand = ({ deviceId }: DeviceCommandProps): JSX.Element => {
  const { sendCommand } = useDevices();
  const [commandType, setCommandType] = useState<CommandType>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [commandId, setCommandId] = useState<string>('');
  const [commandData, setCommandData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set default dates for period reports (current month)
  const getDefaultDates = (): { start: string; end: string } => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    
    return {
      start: formatDateInput(start),
      end: formatDateInput(end),
    };
  };

  const handleCommandTypeChange = (type: CommandType): void => {
    setCommandType(type);
    setError(null);
    setSuccess(null);
    
    // Set default dates for period reports
    if (type === 'period') {
      const dates = getDefaultDates();
      setStartDate(dates.start);
      setEndDate(dates.end);
    } else {
      setStartDate('');
      setEndDate('');
    }
    
    // Clear command-specific fields
    setCommandId('');
    setCommandData('');
  };

  const validateForm = (): boolean => {
    if (!deviceId) {
      setError('No device selected');
      return false;
    }

    if (commandType === 'period') {
      if (!startDate || !endDate) {
        setError('Start date and end date are required for period reports');
        return false;
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        setError('Start date must be before end date');
        return false;
      }
    }

    if (commandType === 'cmd' || commandType === 'spad-naprejenie') {
      if (!commandId) {
        setError('Command ID is required');
        return false;
      }
      if (!commandData) {
        setError('Command data is required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm() || !deviceId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const command: DeviceCommandType = {
        type: commandType,
      };

      // Add period-specific fields
      if (commandType === 'period') {
        command.startDate = startDate;
        command.endDate = endDate;
      }

      // Add command-specific fields
      if (commandType === 'cmd' || commandType === 'spad-naprejenie') {
        command.commandId = commandId;
        command.data = commandData;
      }

      await sendCommand(deviceId, command);
      
      setSuccess('Command sent successfully');
      
      // Reset form after successful submission
      setTimeout(() => {
        setCommandType('daily');
        setStartDate('');
        setEndDate('');
        setCommandId('');
        setCommandData('');
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send command');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No device selected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Select a device from the list to send commands.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Send Command</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Command Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Command Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(['daily', 'daily-X', 'period', 'cmd', 'spad-naprejenie'] as CommandType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCommandTypeChange(type)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                    ${
                      commandType === type
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `.trim()}
                >
                  {type === 'daily-X' ? 'Daily X' : type === 'spad-naprejenie' ? 'Spad Naprejenie' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Period Report Fields */}
        {commandType === 'period' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="start-date"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required={commandType === 'period'}
              error={error && !startDate ? 'Start date is required' : undefined}
            />
            <Input
              id="end-date"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required={commandType === 'period'}
              error={error && !endDate ? 'End date is required' : undefined}
            />
          </div>
        )}

        {/* Custom Command Fields */}
        {(commandType === 'cmd' || commandType === 'spad-naprejenie') && (
          <div className="space-y-4">
            <Input
              id="command-id"
              type="text"
              label="Command ID"
              placeholder="e.g., 2A, 82"
              value={commandId}
              onChange={(e) => setCommandId(e.target.value)}
              required={commandType === 'cmd' || commandType === 'spad-naprejenie'}
              error={error && !commandId ? 'Command ID is required' : undefined}
            />
            <Input
              id="command-data"
              type="text"
              label="Command Data"
              placeholder="e.g., C0C1C2C3"
              value={commandData}
              onChange={(e) => setCommandData(e.target.value)}
              required={commandType === 'cmd' || commandType === 'spad-naprejenie'}
              error={error && !commandData ? 'Command data is required' : undefined}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-red-500 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-green-500 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Success</p>
                <p className="mt-1 text-sm text-green-600">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Send Command
          </Button>
        </div>
      </form>
    </div>
  );
};

