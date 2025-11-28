'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens } from '@/types';
import { AUTH_TOKEN_KEY, USER_KEY } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem(USER_KEY);
        const storedTokens = localStorage.getItem(AUTH_TOKEN_KEY);
        
        if (storedUser && storedTokens) {
          setUser(JSON.parse(storedUser));
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (tokens: AuthTokens, userData: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens));
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};