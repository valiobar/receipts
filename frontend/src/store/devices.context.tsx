import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { apiService } from '@/services/api.service';
import type { Device, DeviceCommand, DeviceStatus } from '@/types';

/**
 * Raw device from server API (status is boolean)
 */
interface RawDeviceFromServer extends Omit<Device, 'status'> {
  status: boolean | DeviceStatus;
}

/**
 * Devices state interface
 */
interface DevicesState {
  devices: Device[];
  onlineDevices: Set<string>;
  selectedDevice: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Devices action types
 */
type DevicesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DEVICES'; payload: RawDeviceFromServer[] }
  | { type: 'UPDATE_DEVICE_STATUS'; payload: { deviceId: string; isOnline: boolean } }
  | { type: 'UPDATE_DEVICE_STATUS_FIELD'; payload: { location: string; status: DeviceStatus } }
  | { type: 'SELECT_DEVICE'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null };

/**
 * Devices context value interface
 */
interface DevicesContextValue extends DevicesState {
  dispatch: React.Dispatch<DevicesAction>;
  fetchDevices: () => Promise<void>;
  updateDeviceStatus: (deviceId: string, isOnline: boolean) => void;
  updateDeviceStatusField: (location: string, status: DeviceStatus) => void;
  selectDevice: (deviceId: string | null) => void;
  sendCommand: (deviceId: string, command: DeviceCommand) => Promise<void>;
}

/**
 * Initial devices state
 */
const initialState: DevicesState = {
  devices: [],
  onlineDevices: new Set<string>(),
  selectedDevice: null,
  isLoading: false,
  error: null,
};

/**
 * Devices reducer function
 */
const devicesReducer = (state: DevicesState, action: DevicesAction): DevicesState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case 'SET_DEVICES':
      // Extract online device IDs from devices array and transform status
      const onlineDevices = new Set<string>();
      const transformedDevices: Device[] = action.payload.map((device) => {
        if (device.online) {
          onlineDevices.add(device.deviceId);
        }
        
        // Transform server's boolean status to DeviceStatus
        // If status is boolean true, set to 'ready'; if false, set to 'offline'
        const status: DeviceStatus = typeof device.status === 'boolean' 
          ? (device.status ? 'ready' : 'offline')
          : device.status;
        
        return {
          ...device,
          status,
        } as Device;
      });
      
      return {
        ...state,
        devices: transformedDevices,
        onlineDevices,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_DEVICE_STATUS': {
      const { deviceId, isOnline } = action.payload;
      const onlineDevices = new Set(state.onlineDevices);
      
      if (isOnline) {
        onlineDevices.add(deviceId);
      } else {
        onlineDevices.delete(deviceId);
      }

      // Update device in devices array
      const devices = state.devices.map((device) =>
        device.deviceId === deviceId ? { ...device, online: isOnline } : device
      );

      return {
        ...state,
        devices,
        onlineDevices,
      };
    }
    case 'UPDATE_DEVICE_STATUS_FIELD': {
      const { location, status } = action.payload;   
      // Update device status field in devices array
      const devices = state.devices.map((device) =>
        device.location === location ? { ...device, status } : device
      );

      return {
        ...state,
        devices,
      };
    }
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDevice: action.payload,
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
 * Devices context
 */
export const DevicesContext = createContext<DevicesContextValue | undefined>(undefined);

/**
 * Devices provider component
 */
interface DevicesProviderProps {
  children: ReactNode;
}

export const DevicesProvider = ({ children }: DevicesProviderProps): JSX.Element => {
  const [state, dispatch] = useReducer(devicesReducer, initialState);

  /**
   * Fetch devices from API
   */
  const fetchDevices = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiService.getDevices();
      console.log('response', response.data);
      if (response.success && response.data) {
        dispatch({ type: 'SET_DEVICES', payload: response.data.devices });
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.error?.message || 'Failed to fetch devices',
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch devices',
      });
    }
  }, []);

  /**
   * Update device online status
   */
  const updateDeviceStatus = useCallback((deviceId: string, isOnline: boolean): void => {
    dispatch({ type: 'UPDATE_DEVICE_STATUS', payload: { deviceId, isOnline } });
  }, []);

  /**
   * Update device status field (ready, processing, error, noPapper)
   */
  const updateDeviceStatusField = useCallback((location: string, status: DeviceStatus): void => {
    dispatch({ type: 'UPDATE_DEVICE_STATUS_FIELD', payload: { location, status } });
  }, []);

  /**
   * Select device for details view
   */
  const selectDevice = useCallback((deviceId: string | null): void => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId });
  }, []);

  const sendCommand = useCallback(
    async (location: string, command: DeviceCommand): Promise<void> => {
      try {
        const response = await apiService.sendDeviceCommand(location, command);
        if (!response.success) {
          throw new Error(response.error?.message || 'Command failed');
        }
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const value: DevicesContextValue = {
    ...state,
    dispatch,
    fetchDevices,
    updateDeviceStatus,
    updateDeviceStatusField,
    selectDevice,
    sendCommand,
  };

  return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>;
};

// Re-export hook from hooks directory for backward compatibility
export { useDevices } from '@/hooks/useDevices';

