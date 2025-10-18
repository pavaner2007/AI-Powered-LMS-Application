import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginData, RegisterData, UpdateProfileData } from '../types';
import { authAPI } from '../services/api';

// Context Type Definition
interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Reducer Action Types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: User };

// Reducer Logic
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };

    case 'LOGOUT':
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };

    case 'UPDATE_PROFILE':
      return { ...state, user: action.payload };

    default:
      return state;
  }
};

// Initial State
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

// Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token and user on first load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user) as User;
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: parsedUser, token } });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Login Function
  const login = async (data: LoginData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.login(data);
      if (!response || !response.token || !response.user) throw new Error('Invalid login response');

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
    } catch (error) {
      console.error('Login failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Register Function
  const register = async (data: RegisterData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(data);
      if (!response || !response.token || !response.user) throw new Error('Invalid register response');

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
    } catch (error) {
      console.error('Register failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  // Update Profile Function
  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const updatedUser = await authAPI.updateProfile(data);
      if (!updatedUser) throw new Error('Profile update failed');

      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_PROFILE', payload: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // Final Context Value
  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook for Using Auth
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
