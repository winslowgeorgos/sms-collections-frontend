'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens, UserDetailsResponse } from '@/types';
import { AUTH_TOKEN_KEY, USER_KEY, USER_DETAILS_KEY } from '@/lib/constants';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  userDetails: UserDetailsResponse | null;
  login: (tokens: AuthTokens, userDetails: UserDetailsResponse) => void;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (codename: string) => boolean;
  hasAnyPermission: (codenames: string[]) => boolean;
  hasAllPermissions: (codenames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window !== 'undefined') {
        const storedTokens = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUserDetails = localStorage.getItem(USER_DETAILS_KEY);
        
        if (storedTokens && storedUserDetails) {
          try {
            const parsedUserDetails = JSON.parse(storedUserDetails);
            setUserDetails(parsedUserDetails);
            setUser(parsedUserDetails.user);
          } catch (error) {
            console.error('Error parsing stored user details:', error);
            // Clear invalid data
            localStorage.removeItem(USER_DETAILS_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (tokens: AuthTokens, userDetailsData: UserDetailsResponse) => {
    // Store tokens
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens));
    
    // Store full user details
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(userDetailsData));
    
    // Also store simplified user object for backward compatibility
    localStorage.setItem(USER_KEY, JSON.stringify({
      id: userDetailsData.user.id.toString(),
      username: userDetailsData.user.username,
      email: userDetailsData.user.email,
      full_name: userDetailsData.user.full_name
    }));
    
    setUserDetails(userDetailsData);
    setUser(userDetailsData.user);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_DETAILS_KEY);
    setUser(null);
    setUserDetails(null);
    window.location.href = '/login';
  };

  // Permission helper functions
  const hasPermission = (codename: string): boolean => {
    if (!userDetails) return false;
    
    // Superusers have all permissions
    if (userDetails.user.is_superuser) return true;
    
    // Check if the permission exists in all_permissions
    return userDetails.user.all_permissions.some(
      (perm: any) => perm.codename === codename
    );
  };

  const hasAnyPermission = (codenames: string[]): boolean => {
    return codenames.some(codename => hasPermission(codename));
  };

  const hasAllPermissions = (codenames: string[]): boolean => {
    return codenames.every(codename => hasPermission(codename));
  };

  const value: AuthContextType = {
    user,
    userDetails,
    login,
    logout,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
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