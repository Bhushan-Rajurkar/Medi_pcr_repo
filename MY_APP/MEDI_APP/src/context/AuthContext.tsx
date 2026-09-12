import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { authService, UserProfile, RegisterRequest } from '@/services/authService';
import { api, USER_KEY, TOKEN_KEY } from '@/services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<string>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  updateUserInState: (updated: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from storage on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = api.getToken();
        if (storedToken) {
          setToken(storedToken);
          // Try loading cached user
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const cachedUser = localStorage.getItem(USER_KEY);
            if (cachedUser) {
              setUser(JSON.parse(cachedUser));
            }
          }
          // Fetch fresh profile
          try {
            const profile = await authService.getProfile();
            setUser(profile);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              localStorage.setItem(USER_KEY, JSON.stringify(profile));
              window.dispatchEvent(new Event('SYNC_FCM_TOKEN'));
            }
          } catch (err) {
            // Token is invalid/expired - clear stale credentials so user is cleanly redirected to Login
            console.warn('Session token expired or invalid, resetting auth state:', err);
            api.setToken(null);
            setToken(null);
            setUser(null);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  // Auto logout if any API request encounters a 401 Unauthorized
  useEffect(() => {
    api.setOnUnauthorized(() => {
      logout();
    });
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      }
      return profile;
    } catch (e) {
      console.error('Failed to refresh profile:', e);
      return null;
    }
  };

  const updateUserInState = (updated: UserProfile) => {
    setUser(updated);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      setToken(res.token);

      // Fetch complete profile
      const profile = await authService.getProfile();
      setUser(profile);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        window.dispatchEvent(new Event('SYNC_FCM_TOKEN'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<string> => {
    return await authService.register(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role ?? null,
        isAdmin: user?.role === 'ROLE_ADMIN',
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateUserInState,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
