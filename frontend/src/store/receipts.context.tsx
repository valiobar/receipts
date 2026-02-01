import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { apiService } from '@/services/api.service';
import type { Receipt, ReceiptFilters } from '@/types';
import type { ReceiptEvent } from '@/types/websocket.types';
import type { Pagination } from '@/types/api.types';

/**
 * Receipts state interface
 */
interface ReceiptsState {
  receipts: Receipt[];
  filters: ReceiptFilters;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Receipts action types
 */
type ReceiptsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RECEIPTS'; payload: { receipts: Receipt[]; pagination: Pagination } }
  | { type: 'SET_FILTERS'; payload: ReceiptFilters }
  | { type: 'ADD_RECEIPT'; payload: Receipt }
  | { type: 'SET_ERROR'; payload: string | null };

/**
 * Receipts context value interface
 */
interface ReceiptsContextValue extends ReceiptsState {
  dispatch: React.Dispatch<ReceiptsAction>;
  fetchReceipts: (filters?: ReceiptFilters) => Promise<void>;
  setFilters: (filters: ReceiptFilters) => void;
  addReceipt: (receiptEvent: ReceiptEvent, deviceId: string) => void;
  exportReceipts: (params: {
    startDate: string;
    endDate: string;
    deviceId?: string;
    format?: 'xlsx' | 'csv';
  }) => Promise<void>;
}

/**
 * Initial receipts state
 */
const initialState: ReceiptsState = {
  receipts: [],
  filters: {},
  pagination: null,
  isLoading: false,
  error: null,
};

/**
 * Receipts reducer function
 */
const receiptsReducer = (state: ReceiptsState, action: ReceiptsAction): ReceiptsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case 'SET_RECEIPTS':
      return {
        ...state,
        receipts: action.payload.receipts,
        pagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
      };
    case 'ADD_RECEIPT':
      // Add receipt to the beginning of the list
      return {
        ...state,
        receipts: [action.payload, ...state.receipts],
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};

/**
 * Receipts context
 */
export const ReceiptsContext = createContext<ReceiptsContextValue | undefined>(undefined);

/**
 * Receipts provider component
 */
interface ReceiptsProviderProps {
  children: ReactNode;
}

export const ReceiptsProvider = ({ children }: ReceiptsProviderProps): JSX.Element => {
  const [state, dispatch] = useReducer(receiptsReducer, initialState);

  /**
   * Fetch receipts from API
   */
  const fetchReceipts = useCallback(
    async (filters?: ReceiptFilters): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Merge with current filters if filters not provided
        const queryFilters = filters || state.filters;
        const response = await apiService.getReceipts(queryFilters);
        if (response.success && response.data) {
          dispatch({
            type: 'SET_RECEIPTS',
            payload: {
              receipts: response.data.receipts,
              pagination: response.data.pagination,
            },
          });
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: response.error?.message || 'Failed to fetch receipts',
          });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to fetch receipts',
        });
      }
    },
    [state.filters]
  );

  /**
   * Set receipt filters
   */
  const setFilters = useCallback((filters: ReceiptFilters): void => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  /**
   * Add receipt from WebSocket event
   * Converts ReceiptEvent format to Receipt format
   */
  const addReceipt = useCallback((receiptEvent: ReceiptEvent, deviceId: string): void => {
    // Convert ReceiptEvent to Receipt format
    const receipt: Receipt = {
      _id: receiptEvent.MessageId.toString(),
      device: deviceId,
      amount: receiptEvent.price,
      MembershipFee: '0', // Not available in ReceiptEvent, default to 0
      userNumber: receiptEvent.user,
      location: receiptEvent.location,
      ip: '', // Not available in ReceiptEvent, default to empty
      Status: 'pending', // New receipts are always pending
      ts: new Date().toISOString(), // Current timestamp
    };
    dispatch({ type: 'ADD_RECEIPT', payload: receipt });
  }, []);

  /**
   * Export receipts to Excel/CSV file
   */
  const exportReceipts = useCallback(
    async (params: {
      startDate: string;
      endDate: string;
      deviceId?: string;
      format?: 'xlsx' | 'csv';
    }): Promise<void> => {
      try {
        const blob = await apiService.exportReceipts(params);
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipts-${new Date().toISOString().split('T')[0]}.${params.format || 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to export receipts',
        });
        throw error;
      }
    },
    []
  );

  const value: ReceiptsContextValue = {
    ...state,
    dispatch,
    fetchReceipts,
    setFilters,
    addReceipt,
    exportReceipts,
  };

  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
};

// Re-export hook from hooks directory for backward compatibility
export { useReceipts } from '@/hooks/useReceipts';

