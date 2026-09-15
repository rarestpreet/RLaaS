import React, { createContext, useContext, useEffect, useState } from 'react';
import { logoutCustomer } from '../api/auth';

export interface AuthUser {
  customerId: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = () => {
    try {
      const savedToken = localStorage.getItem('rlaas_token');
      const savedUser = localStorage.getItem('rlaas_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    const handleAuthChange = () => {
      initAuth();
    };

    window.addEventListener('rlaas_auth_change', handleAuthChange);
    return () => window.removeEventListener('rlaas_auth_change', handleAuthChange);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('rlaas_token', newToken);
    localStorage.setItem('rlaas_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await logoutCustomer();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('rlaas_token');
      localStorage.removeItem('rlaas_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedFields: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...updatedFields };
    localStorage.setItem('rlaas_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
