# Frontend Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Patterns](#architecture-patterns)
5. [State Management](#state-management)
6. [Services Layer](#services-layer)
7. [Custom Hooks](#custom-hooks)
8. [Component Architecture](#component-architecture)
9. [Routing & Authentication](#routing--authentication)
10. [WebSocket Integration](#websocket-integration)
11. [API Integration](#api-integration)
12. [Styling with TailwindCSS](#styling-with-tailwindcss)
13. [Type Safety](#type-safety)
14. [Error Handling](#error-handling)
15. [Performance Optimization](#performance-optimization)
16. [Development Workflow](#development-workflow)
17. [Implementation Guide](#implementation-guide)

---

## Overview

The frontend is a React Single Page Application (SPA) built with TypeScript, Vite, and TailwindCSS. It provides a real-time dashboard for monitoring receipts, managing devices, and viewing system status. The application communicates with the backend via REST API for data operations and WebSocket for real-time updates.

### Key Features

- **Real-time Updates**: WebSocket connection for live receipt events and device status changes
- **Authentication**: JWT-based authentication with protected routes
- **Device Management**: View device status, send commands, monitor connections
- **Receipt Management**: Query, filter, and export receipts
- **Responsive Design**: Mobile-friendly UI with TailwindCSS
- **Type Safety**: Full TypeScript implementation with strict mode

### Integration Points

- **REST API**: All data operations (see [`REST_API.md`](./REST_API.md))
- **WebSocket Client**: Real-time updates (see [`COMMUNICATION_PROTOCOL.md`](./COMMUNICATION_PROTOCOL.md))
- **Backend Services**: ReceiptService, DeviceService, CommandService (see [`ARCHITECTURE.md`](./ARCHITECTURE.md))

---

## Technology Stack

### Core Technologies

- **React 18.2+**: UI library with functional components and hooks
- **TypeScript 5.2+**: Type-safe JavaScript with strict mode
- **Vite 4.5+**: Fast build tool and dev server
- **React Router 6.17+**: Client-side routing
- **TailwindCSS 3.3+**: Utility-first CSS framework

### Communication Libraries

- **Axios 1.5+**: HTTP client for REST API calls
- **Socket.io-client 4.6+**: WebSocket client for real-time updates

### Development Tools

- **@vitejs/plugin-react**: Vite plugin for React
- **PostCSS & Autoprefixer**: CSS processing
- **TypeScript**: Type checking and compilation

### Build Output

- **Production Build**: `frontend/dist/` (served from `server/public/`)
- **Development Server**: Vite dev server with HMR
- **Asset Optimization**: Automatic code splitting and asset hashing

---

## Project Structure

```
frontend/
├── public/                    # Static assets (images, favicon, etc.)
│   ├── favicon.ico
│   └── ...
├── src/
│   ├── components/           # React components
│   │   ├── common/           # Shared/reusable components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── receipts/         # Receipt-related components
│   │   │   ├── ReceiptList.tsx
│   │   │   ├── ReceiptCard.tsx
│   │   │   ├── ReceiptFilters.tsx
│   │   │   └── ReceiptExport.tsx
│   │   └── devices/          # Device-related components
│   │       ├── DeviceList.tsx
│   │       ├── DeviceCard.tsx
│   │       ├── DeviceStatus.tsx
│   │       └── DeviceCommand.tsx
│   ├── pages/                # Page components (routes)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Receipts.tsx
│   │   └── Devices.tsx
│   ├── services/            # API and WebSocket services
│   │   ├── api.service.ts    # REST API client
│   │   ├── auth.service.ts   # Authentication service
│   │   └── websocket.service.ts  # WebSocket client
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useReceipts.ts
│   │   ├── useDevices.ts
│   │   └── useApi.ts
│   ├── store/                # State management (Context API or Redux)
│   │   ├── auth.context.tsx  # Auth state context
│   │   ├── devices.context.tsx  # Devices state context
│   │   └── receipts.context.tsx  # Receipts state context
│   ├── types/                # TypeScript type definitions
│   │   ├── api.types.ts      # API response types
│   │   ├── receipt.types.ts  # Receipt types
│   │   ├── device.types.ts   # Device types
│   │   ├── user.types.ts     # User types
│   │   └── websocket.types.ts  # WebSocket message types
│   ├── utils/                # Utility functions
│   │   ├── token.ts          # Token management
│   │   ├── date.ts           # Date formatting
│   │   ├── validation.ts     # Form validation
│   │   └── constants.ts      # App constants
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles + Tailwind imports
├── dist/                     # Build output (gitignored)
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # TailwindCSS configuration
├── postcss.config.js         # PostCSS configuration
└── package.json
```

---

## Architecture Patterns

### Component Hierarchy

```
App
├── Router
│   ├── Public Routes
│   │   └── Login
│   └── Protected Routes
│       ├── Layout (Header + Sidebar)
│       ├── Dashboard
│       ├── Receipts
│       │   ├── ReceiptFilters
│       │   └── ReceiptList
│       │       └── ReceiptCard (multiple)
│       └── Devices
│           ├── DeviceList
│           │   └── DeviceCard (multiple)
│           └── DeviceCommand
```

### Data Flow

```
User Action
    ↓
Component (UI)
    ↓
Custom Hook (useReceipts, useDevices, etc.)
    ↓
Service (api.service.ts, websocket.service.ts)
    ↓
Backend API / WebSocket
    ↓
Response
    ↓
State Update (Context/State)
    ↓
Component Re-render
```

### Separation of Concerns

1. **Components**: Pure UI presentation, receive props, emit events
2. **Hooks**: Business logic, data fetching, state management
3. **Services**: API communication, WebSocket handling
4. **Types**: TypeScript definitions for type safety
5. **Utils**: Pure functions, helpers, constants

---

## State Management

### Approach: React Context API

For this application, we use React Context API with custom hooks for state management. This provides:
- Simple state management without external dependencies
- Type-safe state updates
- Easy integration with custom hooks
- Sufficient for the application's complexity

### State Slices

#### 1. Auth Context (`auth.context.tsx`)

**State:**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions:**
- `login(username, password)`: Authenticate user
- `logout()`: Clear auth state
- `refreshToken()`: Refresh JWT token
- `setUser(user)`: Update user data

**Usage:**
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

#### 2. Devices Context (`devices.context.tsx`)

**State:**
```typescript
interface DevicesState {
  devices: Device[];
  onlineDevices: Set<string>;  // Set of online device IDs
  selectedDevice: string | null;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `fetchDevices()`: Load all devices
- `updateDeviceStatus(deviceId, status)`: Update device online status
- `selectDevice(deviceId)`: Select device for details
- `sendCommand(deviceId, command)`: Send command to device

**Usage:**
```typescript
const { devices, onlineDevices, fetchDevices, sendCommand } = useDevices();
```

#### 3. Receipts Context (`receipts.context.tsx`)

**State:**
```typescript
interface ReceiptsState {
  receipts: Receipt[];
  filters: ReceiptFilters;
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `fetchReceipts(filters)`: Load receipts with filters
- `setFilters(filters)`: Update filter criteria
- `addReceipt(receipt)`: Add new receipt (from WebSocket)
- `exportReceipts(filters)`: Export to Excel

**Usage:**
```typescript
const { receipts, filters, fetchReceipts, setFilters } = useReceipts();
```

### State Updates from WebSocket

WebSocket messages update state via context actions:

```typescript
// In useWebSocket hook
socket.on('receipt', (data: ReceiptEvent) => {
  receiptsContext.addReceipt(data);
});

socket.on('connect', (data: DeviceStatusEvent) => {
  devicesContext.updateDeviceStatus(data.location.device, data.location.status);
});
```

---

## Services Layer

### 1. API Service (`api.service.ts`)

**Purpose**: Centralized REST API client using Axios

**Features:**
- Automatic token injection
- Request/response interceptors
- Error handling
- Type-safe responses

**Implementation:**
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getToken, removeToken } from '@/utils/token';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: Add token
    this.client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          removeToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username: string, password: string): Promise<LoginResponse> {
    return this.client.post('/auth/login', { username, password });
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.client.post('/auth/refresh');
  }

  async logout(): Promise<void> {
    return this.client.post('/auth/logout');
  }

  // Receipts
  async getReceipts(params?: ReceiptQueryParams): Promise<ReceiptsResponse> {
    return this.client.get('/receipts', { params });
  }

  async getReceipt(id: string): Promise<ReceiptResponse> {
    return this.client.get(`/receipts/${id}`);
  }

  async exportReceipts(params: ExportParams): Promise<Blob> {
    return this.client.get('/receipts/export', {
      params,
      responseType: 'blob',
    });
  }

  // Devices
  async getDevices(params?: DeviceQueryParams): Promise<DevicesResponse> {
    return this.client.get('/devices', { params });
  }

  async getDevice(id: string): Promise<DeviceResponse> {
    return this.client.get(`/devices/${id}`);
  }

  async getDeviceStatus(id: string): Promise<DeviceStatusResponse> {
    return this.client.get(`/devices/${id}/status`);
  }

  async sendDeviceCommand(
    deviceId: string,
    command: DeviceCommand
  ): Promise<CommandResponse> {
    return this.client.post(`/devices/${deviceId}/command`, command);
  }

  // System
  async getSystemStatus(): Promise<SystemStatusResponse> {
    return this.client.get('/system/status');
  }
}

export const apiService = new ApiService();
```

### 2. Auth Service (`auth.service.ts`)

**Purpose**: Authentication-specific operations

**Implementation:**
```typescript
import { apiService } from './api.service';
import { setToken, getToken, removeToken } from '@/utils/token';
import type { User, LoginCredentials } from '@/types/user.types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiService.login(
      credentials.username,
      credentials.password
    );
    
    if (response.success && response.data.token) {
      setToken(response.data.token);
      return {
        user: response.data.user,
        token: response.data.token,
      };
    }
    
    throw new Error(response.error?.message || 'Login failed');
  }

  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } finally {
      removeToken();
    }
  }

  async refreshToken(): Promise<string> {
    const response = await apiService.refreshToken();
    if (response.success && response.data.token) {
      setToken(response.data.token);
      return response.data.token;
    }
    throw new Error('Token refresh failed');
  }

  isAuthenticated(): boolean {
    return !!getToken();
  }
}

export const authService = new AuthService();
```

### 3. WebSocket Service (`websocket.service.ts`)

**Purpose**: WebSocket connection management and message handling

**Implementation:**
```typescript
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/utils/token';
import type {
  ClientMessage,
  ReceiptEvent,
  DeviceStatusEvent,
  NoPaperEvent,
  SpadNaprejenieEvent,
} from '@/types/websocket.types';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = getToken();
    const wsUrl = import.meta.env.VITE_WS_URL || '';

    this.socket = io(wsUrl, {
      path: '/client',
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
    });

    // Receipt event (no type wrapper)
    this.socket.on('message', (data: ClientMessage) => {
      // Handle different message types
      if ('action' in data && data.action === 'print') {
        this.handleReceiptEvent(data as ReceiptEvent);
      } else if (data.type === 'connect') {
        this.handleDeviceStatusEvent(data as DeviceStatusEvent);
      } else if (data.type === 'noPaper') {
        this.handleNoPaperEvent(data as NoPaperEvent);
      } else if (data.type === 'spad-naprejenie') {
        this.handleSpadNaprejenieEvent(data as SpadNaprejenieEvent);
      } else if (data.type === 'info') {
        console.log('Info:', data.message);
      }
    });
  }

  private handleReceiptEvent(data: ReceiptEvent): void {
    // Emit custom event for components to listen
    window.dispatchEvent(
      new CustomEvent('receipt-event', { detail: data })
    );
  }

  private handleDeviceStatusEvent(data: DeviceStatusEvent): void {
    window.dispatchEvent(
      new CustomEvent('device-status-event', { detail: data })
    );
  }

  private handleNoPaperEvent(data: NoPaperEvent): void {
    window.dispatchEvent(
      new CustomEvent('no-paper-event', { detail: data })
    );
  }

  private handleSpadNaprejenieEvent(data: SpadNaprejenieEvent): void {
    window.dispatchEvent(
      new CustomEvent('spad-naprejenie-event', { detail: data })
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const websocketService = new WebSocketService();
```

**Note**: The WebSocket protocol uses raw WebSocket (not Socket.IO) on the backend, but we use `socket.io-client` for compatibility. The backend's `/client` endpoint accepts Socket.IO connections.

---

## Custom Hooks

### 1. `useAuth` Hook

**Purpose**: Authentication state and operations

**Implementation:**
```typescript
import { useContext } from 'react';
import { AuthContext } from '@/store/auth.context';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Usage:**
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### 2. `useWebSocket` Hook

**Purpose**: WebSocket connection management and event handling

**Implementation:**
```typescript
import { useEffect, useRef } from 'react';
import { websocketService } from '@/services/websocket.service';
import { useAuth } from './useAuth';
import { useDevices } from './useDevices';
import { useReceipts } from './useReceipts';

export const useWebSocket = (): void => {
  const { isAuthenticated } = useAuth();
  const { updateDeviceStatus } = useDevices();
  const { addReceipt } = useReceipts();
  const handlersSetup = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      websocketService.disconnect();
      return;
    }

    if (!handlersSetup.current) {
      // Setup event listeners
      const handleReceipt = (event: CustomEvent<ReceiptEvent>) => {
        addReceipt(event.detail);
      };

      const handleDeviceStatus = (event: CustomEvent<DeviceStatusEvent>) => {
        const { location } = event.detail;
        updateDeviceStatus(location.device, location.status);
      };

      window.addEventListener('receipt-event', handleReceipt as EventListener);
      window.addEventListener('device-status-event', handleDeviceStatus as EventListener);

      handlersSetup.current = true;

      return () => {
        window.removeEventListener('receipt-event', handleReceipt as EventListener);
        window.removeEventListener('device-status-event', handleDeviceStatus as EventListener);
      };
    }
  }, [isAuthenticated, addReceipt, updateDeviceStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }

    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);
};
```

### 3. `useReceipts` Hook

**Purpose**: Receipt data fetching and management

**Implementation:**
```typescript
import { useContext, useCallback } from 'react';
import { ReceiptsContext } from '@/store/receipts.context';
import { apiService } from '@/services/api.service';
import type { ReceiptFilters } from '@/types/receipt.types';

export const useReceipts = () => {
  const context = useContext(ReceiptsContext);
  if (!context) {
    throw new Error('useReceipts must be used within ReceiptsProvider');
  }

  const { receipts, filters, pagination, isLoading, error, dispatch } = context;

  const fetchReceipts = useCallback(
    async (newFilters?: Partial<ReceiptFilters>) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const params = { ...filters, ...newFilters };
        const response = await apiService.getReceipts(params);
        if (response.success) {
          dispatch({
            type: 'SET_RECEIPTS',
            payload: {
              receipts: response.data.receipts,
              pagination: response.data.pagination,
            },
          });
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [filters, dispatch]
  );

  const setFilters = useCallback(
    (newFilters: Partial<ReceiptFilters>) => {
      dispatch({ type: 'SET_FILTERS', payload: newFilters });
    },
    [dispatch]
  );

  const addReceipt = useCallback(
    (receipt: Receipt) => {
      dispatch({ type: 'ADD_RECEIPT', payload: receipt });
    },
    [dispatch]
  );

  const exportReceipts = useCallback(
    async (exportFilters?: ReceiptFilters) => {
      const params = exportFilters || filters;
      const blob = await apiService.exportReceipts(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    [filters]
  );

  return {
    receipts,
    filters,
    pagination,
    isLoading,
    error,
    fetchReceipts,
    setFilters,
    addReceipt,
    exportReceipts,
  };
};
```

### 4. `useDevices` Hook

**Purpose**: Device data fetching and management

**Implementation:**
```typescript
import { useContext, useCallback } from 'react';
import { DevicesContext } from '@/store/devices.context';
import { apiService } from '@/services/api.service';
import type { DeviceCommand } from '@/types/device.types';

export const useDevices = () => {
  const context = useContext(DevicesContext);
  if (!context) {
    throw new Error('useDevices must be used within DevicesProvider');
  }

  const { devices, onlineDevices, selectedDevice, isLoading, error, dispatch } = context;

  const fetchDevices = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiService.getDevices();
      if (response.success) {
        dispatch({ type: 'SET_DEVICES', payload: response.data.devices });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const updateDeviceStatus = useCallback(
    (deviceId: string, isOnline: boolean) => {
      dispatch({
        type: 'UPDATE_DEVICE_STATUS',
        payload: { deviceId, isOnline },
      });
    },
    [dispatch]
  );

  const sendCommand = useCallback(
    async (deviceId: string, command: DeviceCommand) => {
      try {
        const response = await apiService.sendDeviceCommand(deviceId, command);
        if (response.success) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Command failed');
      } catch (err) {
        throw err;
      }
    },
    []
  );

  return {
    devices,
    onlineDevices,
    selectedDevice,
    isLoading,
    error,
    fetchDevices,
    updateDeviceStatus,
    sendCommand,
  };
};
```

---

## Component Architecture

### Component Principles

1. **Functional Components Only**: No class components
2. **Small & Focused**: Each component does one thing
3. **Props Interface**: Explicit TypeScript interfaces for props
4. **Composition**: Prefer composition over inheritance
5. **Separation**: UI logic in components, business logic in hooks

### Common Components

#### Header Component

**Location**: `src/components/common/Header.tsx`

**Props:**
```typescript
interface HeaderProps {
  user: User;
  onLogout: () => void;
}
```

**Responsibilities:**
- Display user information
- Logout button
- Navigation links (optional)

#### Sidebar Component

**Location**: `src/components/common/Sidebar.tsx`

**Props:**
```typescript
interface SidebarProps {
  currentPath: string;
}
```

**Responsibilities:**
- Navigation menu
- Active route highlighting
- Collapsible on mobile

#### Loading Component

**Location**: `src/components/common/Loading.tsx`

**Props:**
```typescript
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}
```

**Usage:**
```typescript
{isLoading && <Loading message="Loading receipts..." />}
```

#### ErrorBoundary Component

**Location**: `src/components/common/ErrorBoundary.tsx`

**Purpose**: Catch React errors and display fallback UI

**Implementation:**
```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Receipt Components

#### ReceiptList Component

**Location**: `src/components/receipts/ReceiptList.tsx`

**Props:**
```typescript
interface ReceiptListProps {
  receipts: Receipt[];
  isLoading: boolean;
  onFilterChange: (filters: ReceiptFilters) => void;
}
```

**Responsibilities:**
- Display list of receipts
- Pagination controls
- Empty state
- Loading state

#### ReceiptCard Component

**Location**: `src/components/receipts/ReceiptCard.tsx`

**Props:**
```typescript
interface ReceiptCardProps {
  receipt: Receipt;
  onClick?: (receipt: Receipt) => void;
}
```

**Responsibilities:**
- Display single receipt information
- Format dates and amounts
- Click handler for details

#### ReceiptFilters Component

**Location**: `src/components/receipts/ReceiptFilters.tsx`

**Props:**
```typescript
interface ReceiptFiltersProps {
  filters: ReceiptFilters;
  onFiltersChange: (filters: Partial<ReceiptFilters>) => void;
  devices: Device[];
}
```

**Responsibilities:**
- Filter form (device, date range, user number)
- Apply/Reset buttons
- Validation

### Device Components

#### DeviceList Component

**Location**: `src/components/devices/DeviceList.tsx`

**Props:**
```typescript
interface DeviceListProps {
  devices: Device[];
  onlineDevices: Set<string>;
  onDeviceSelect: (deviceId: string) => void;
}
```

**Responsibilities:**
- Display grid/list of devices
- Show online/offline status
- Device selection

#### DeviceCard Component

**Location**: `src/components/devices/DeviceCard.tsx`

**Props:**
```typescript
interface DeviceCardProps {
  device: Device;
  isOnline: boolean;
  onClick?: () => void;
}
```

**Responsibilities:**
- Display device information
- Status indicator (online/offline)
- Last seen timestamp

#### DeviceStatus Component

**Location**: `src/components/devices/DeviceStatus.tsx`

**Props:**
```typescript
interface DeviceStatusProps {
  deviceId: string;
}
```

**Responsibilities:**
- Real-time device status
- Pending commands count
- Last command information

#### DeviceCommand Component

**Location**: `src/components/devices/DeviceCommand.tsx`

**Props:**
```typescript
interface DeviceCommandProps {
  deviceId: string;
  onCommandSent: () => void;
}
```

**Responsibilities:**
- Command form (daily, period, custom)
- Date pickers for period reports
- Command submission
- Success/error feedback

---

## Routing & Authentication

### Route Structure

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/store/auth.context';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Layout } from '@/components/common/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Receipts } from '@/pages/Receipts';
import { Devices } from '@/pages/Devices';

export const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="devices" element={<Devices />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

### Protected Route Component

**Location**: `src/components/common/ProtectedRoute.tsx`

**Implementation:**
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from './Loading';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps): JSX.Element => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

### Authentication Flow

1. **Login Page**: User enters credentials
2. **Auth Service**: Calls `/api/auth/login`
3. **Token Storage**: Store JWT in localStorage/sessionStorage
4. **Context Update**: Update AuthContext with user and token
5. **Redirect**: Navigate to dashboard
6. **Protected Routes**: Check authentication on route access
7. **Token Refresh**: Refresh token before expiration
8. **Logout**: Clear token and redirect to login

### Route Guards

- **Public Routes**: `/login` (redirect if authenticated)
- **Protected Routes**: All other routes (redirect if not authenticated)
- **Role-Based**: Future enhancement for Admin/Super roles

---

## WebSocket Integration

### Connection Lifecycle

1. **User Logs In**: Token obtained
2. **App Initializes**: `useWebSocket` hook called
3. **WebSocket Connects**: `websocketService.connect()` called
4. **Event Handlers**: Setup listeners for receipt, device status, etc.
5. **Real-time Updates**: Messages update state via context
6. **User Logs Out**: WebSocket disconnects

### Message Handling

**Receipt Events:**
```typescript
// Message format (no type wrapper)
{
  MessageId: "65a1b2c3d4e5f6a7b8c9d0e1",
  UnicSaleNum: "1523",
  action: "print",
  price: "2.76",
  user: "123456",
  location: "Bulgaria"
}
```

**Device Status Events:**
```typescript
{
  type: "connect",
  location: {
    name: "Bulgaria",
    device: "123",
    status: true  // true = online, false = offline
  }
}
```

**No Paper Events:**
```typescript
{
  type: "noPaper",
  location: {
    name: "Bulgaria",
    device: "123",
    status: true
  }
}
```

**Spad Naprejenie Events:**
```typescript
{
  type: "spad-naprejenie",
  location: {
    name: "Bulgaria",
    device: "123",
    status: true
  }
}
```

### Reconnection Strategy

- **Automatic Reconnection**: Socket.io-client handles reconnection
- **Max Attempts**: 5 reconnection attempts
- **Exponential Backoff**: Delay increases with each attempt
- **User Notification**: Show connection status in UI

---

## API Integration

### API Base URL

**Development:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

**Production:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || '/api';
```

### Request Headers

All authenticated requests include:
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Response Format

**Success:**
```typescript
{
  success: true,
  data: { ... },
  meta: {
    timestamp: "2024-01-15T10:30:00Z",
    requestId: "req_123456789"
  }
}
```

**Error:**
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    details: { ... }
  },
  meta: {
    timestamp: "2024-01-15T10:30:00Z",
    requestId: "req_123456789"
  }
}
```

### Error Handling

**401 Unauthorized:**
- Clear token
- Redirect to login

**403 Forbidden:**
- Show error message
- Log error

**422 Validation Error:**
- Display field-level errors
- Highlight invalid fields

**500 Server Error:**
- Show generic error message
- Log error details

---

## Styling with TailwindCSS

### Configuration

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
```

### Class Naming Convention

- **Component Classes**: Use kebab-case in Tailwind strings for readability
- **Example**: `className="chat-box-header text-gray-700 font-semibold"`
- **Constants**: Use UPPER_SNAKE_CASE for repeated class patterns

### Utility Classes

**Layout:**
```typescript
const CONTAINER_CLASSES = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
const CARD_CLASSES = "bg-white rounded-lg shadow-md p-6";
```

**Responsive Design:**
```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

### Component Styling Example

```typescript
export const ReceiptCard = ({ receipt }: ReceiptCardProps): JSX.Element => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Receipt #{receipt.UnicSaleNum}
        </h3>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          {receipt.Status}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p>User: {receipt.userNumber}</p>
        <p>Amount: {receipt.price} BGN</p>
        <p>Location: {receipt.location}</p>
        <p className="text-xs text-gray-400">
          {formatDate(receipt.ts)}
        </p>
      </div>
    </div>
  );
};
```

---

## Type Safety

### Type Definitions

**API Types** (`src/types/api.types.ts`):
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

**Receipt Types** (`src/types/receipt.types.ts`):
```typescript
export interface Receipt {
  _id: string;
  device: string;
  amount: string;
  MembershipFee: string;
  userNumber: string;
  location: string;
  ip: string;
  Status: 'pending' | 'processed';
  ts: string;
}

export interface ReceiptFilters {
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  userNumber?: string;
  status?: 'pending' | 'processed';
  limit?: number;
  offset?: number;
}
```

**Device Types** (`src/types/device.types.ts`):
```typescript
export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  location: string;
  status: boolean;
  online: boolean;
  lastSeen?: string;
  metadata?: {
    firmwareVersion?: string;
    model?: string;
  };
}

export interface DeviceCommand {
  type: 'daily' | 'period' | 'cmd' | 'daily-X' | 'spad-naprejenie';
  startDate?: string;
  endDate?: string;
  commandId?: string;
  data?: string;
}
```

**WebSocket Types** (`src/types/websocket.types.ts`):
```typescript
export interface ReceiptEvent {
  MessageId: string;
  UnicSaleNum: string;
  action: 'print';
  price: string;
  user: string;
  location: string;
}

export interface DeviceStatusEvent {
  type: 'connect';
  location: {
    name: string;
    device: string;
    status: boolean;
  };
}

export interface NoPaperEvent {
  type: 'noPaper';
  location: {
    name: string;
    device: string;
    status: boolean;
  };
}

export interface SpadNaprejenieEvent {
  type: 'spad-naprejenie';
  location: {
    name: string;
    device: string;
    status: boolean;
  };
}

export type ClientMessage = ReceiptEvent | DeviceStatusEvent | NoPaperEvent | SpadNaprejenieEvent;
```

### Type Safety Rules

1. **No `any` Types**: Use `unknown` and narrow types safely
2. **Explicit Return Types**: Public functions must have return types
3. **Strict Mode**: TypeScript `strict: true` enabled
4. **Type Imports**: Import types with `import type` when possible

---

## Error Handling

### Error Boundaries

- **Component Level**: `ErrorBoundary` catches React errors
- **Route Level**: Error boundary per route (optional)
- **Global Level**: Root error boundary

### API Error Handling

```typescript
try {
  const response = await apiService.getReceipts();
  if (response.success) {
    // Handle success
  } else {
    // Handle API error
    console.error(response.error);
  }
} catch (error) {
  // Handle network/unknown error
  console.error('Request failed:', error);
}
```

### User-Friendly Error Messages

- **Network Errors**: "Unable to connect to server. Please check your connection."
- **Validation Errors**: Display field-specific errors
- **Server Errors**: "Something went wrong. Please try again later."
- **401 Errors**: Automatically redirect to login

---

## Performance Optimization

### Code Splitting

**Route-Based Splitting:**
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Receipts = lazy(() => import('@/pages/Receipts'));
const Devices = lazy(() => import('@/pages/Devices'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/receipts" element={<Receipts />} />
    <Route path="/devices" element={<Devices />} />
  </Routes>
</Suspense>
```

### Memoization

**Use `React.memo` sparingly:**
```typescript
export const ReceiptCard = React.memo(({ receipt }: ReceiptCardProps) => {
  // Component implementation
});
```

**Use `useMemo` for expensive computations:**
```typescript
const filteredReceipts = useMemo(
  () => receipts.filter(/* filter logic */),
  [receipts, filters]
);
```

**Use `useCallback` for stable function references:**
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Lazy Loading

- **Images**: Lazy load images below the fold
- **Components**: Lazy load heavy components
- **Routes**: Code split by route

---

## Development Workflow

### Development Server

```bash
cd frontend
npm run dev
```

**Features:**
- Hot Module Replacement (HMR)
- Fast refresh
- Source maps
- Proxy configuration for API

### Build Process

```bash
cd frontend
npm run build
```

**Output:**
- `frontend/dist/`: Production build
- Optimized and minified
- Asset hashing for cache busting

### Type Checking

```bash
npm run type-check
```

**Purpose:**
- Validate TypeScript without emitting files
- CI/CD integration

### Watch Mode (for production build)

```bash
npm run dev:watch
```

**Purpose:**
- Rebuild on file changes
- Output to `dist/` for server integration

---

## Implementation Guide

### Step 1: Setup Project Structure

1. Create directory structure
2. Setup TailwindCSS configuration
3. Create base components (Header, Sidebar, Loading)
4. Setup routing structure

### Step 2: Implement Services

1. Create `api.service.ts` with Axios client
2. Create `auth.service.ts` for authentication
3. Create `websocket.service.ts` for WebSocket

### Step 3: Implement State Management

1. Create context providers (Auth, Devices, Receipts)
2. Implement context reducers
3. Create custom hooks (useAuth, useDevices, useReceipts)

### Step 4: Implement Pages

1. **Login Page**: Form, validation, API integration
2. **Dashboard Page**: Overview, statistics, real-time updates
3. **Receipts Page**: List, filters, export
4. **Devices Page**: Device list, status, commands

### Step 5: Implement Components

1. **Common Components**: Header, Sidebar, Loading, ErrorBoundary
2. **Receipt Components**: ReceiptList, ReceiptCard, ReceiptFilters
3. **Device Components**: DeviceList, DeviceCard, DeviceStatus, DeviceCommand

### Step 6: Integrate WebSocket

1. Implement `useWebSocket` hook
2. Connect WebSocket on authentication
3. Handle real-time events
4. Update state from WebSocket messages

### Step 7: Testing & Refinement

1. Test authentication flow
2. Test API integration
3. Test WebSocket connection
4. Test error handling
5. Test responsive design

---

## Environment Variables

### Development

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

### Production

```env
VITE_API_URL=/api
VITE_WS_URL=wss://api.example.com
```

**Note**: Vite uses `VITE_` prefix for environment variables. These are embedded at build time.

---

## Best Practices

### Component Design

1. **Single Responsibility**: Each component does one thing
2. **Props Interface**: Explicit TypeScript interfaces
3. **Composition**: Prefer composition over inheritance
4. **Reusability**: Extract common patterns into reusable components

### State Management

1. **Context for Global State**: Use Context API for app-wide state
2. **Local State for UI**: Use `useState` for component-specific state
3. **Derived State**: Compute from existing state when possible
4. **Avoid Prop Drilling**: Use context for deeply nested props

### Performance

1. **Memoization**: Only when measurable performance issues exist
2. **Code Splitting**: Lazy load routes and heavy components
3. **Image Optimization**: Use appropriate image formats and sizes
4. **Bundle Analysis**: Monitor bundle size

### Code Quality

1. **Type Safety**: No `any` types, use strict TypeScript
2. **Error Handling**: Handle all error cases
3. **Loading States**: Show loading indicators
4. **Empty States**: Handle empty data gracefully

---

## References

- **Backend Architecture**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **REST API**: [`REST_API.md`](./REST_API.md)
- **Communication Protocol**: [`COMMUNICATION_PROTOCOL.md`](./COMMUNICATION_PROTOCOL.md)
- **React Documentation**: https://react.dev
- **TypeScript Documentation**: https://www.typescriptlang.org
- **TailwindCSS Documentation**: https://tailwindcss.com
- **Vite Documentation**: https://vitejs.dev

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-18  
**Maintained By:** Development Team

