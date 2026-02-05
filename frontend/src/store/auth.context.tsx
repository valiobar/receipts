import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { getToken } from '@/utils/token';
import type { User, LoginCredentials } from '@/types';

/**
 * Auth state interface
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth action types
 */
type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: string }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INIT_AUTH'; payload: string | null };

/**
 * Auth context value interface
 */
interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}

/**
 * Initialize auth state from localStorage synchronously
 */
const getInitialAuthState = (): AuthState => {
  const token = getToken();
  return {
    user: null,
    token,
    isAuthenticated: !!token,
    isLoading: false,
  };
};

/**
 * Initial auth state
 */
const initialState: AuthState = getInitialAuthState();

/**
 * Auth reducer function
 */
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload,
        isAuthenticated: true,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'INIT_AUTH':
      return {
        ...state,
        token: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth provider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = getToken();
    dispatch({ type: 'INIT_AUTH', payload: token });
  }, []);

  /**
   * Login action
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, token } = await authService.login(credentials);
      dispatch({ type: 'LOGIN', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  /**
   * Logout action
   */
  const logout = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authService.logout();
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  /**
   * Refresh token action
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const token = await authService.refreshToken();
      dispatch({ type: 'REFRESH_TOKEN', payload: token });
    } catch (error) {
      // If refresh fails, logout user
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  }, []);

  /**
   * Set user action
   */
  const setUser = useCallback((user: User): void => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Export context and component (must be after definitions for Fast Refresh)
export { AuthContext, AuthProvider };

// Re-export hook from hooks directory for backward compatibility
export { useAuth } from '@/hooks/useAuth';

