import { useContext } from 'react';
import { ReceiptsContext } from '@/store/receipts.context';

/**
 * Hook to access receipts context
 * @returns Receipts context value
 * @throws Error if used outside ReceiptsProvider
 */
export const useReceipts = () => {
  const context = useContext(ReceiptsContext);
  if (!context) {
    throw new Error('useReceipts must be used within ReceiptsProvider');
  }
  return context;
};

