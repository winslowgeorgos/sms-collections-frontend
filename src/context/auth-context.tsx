'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens, UserDetailsResponse } from '@/types';
import { AUTH_TOKEN_KEY, USER_KEY, USER_DETAILS_KEY } from '@/lib/constants';
import { apiClient } from '@/lib/api';
import {setSessionSeed,getSessionSeed,clearSecuritySession,encryptAndStore,retrieveAndDecrypt,} from '@/utils/sec';

interface ExtendedAuthTokens extends AuthTokens {
  session_seed?: string;
}

interface AuthContextType {
  user: User | null;
  userDetails: UserDetailsResponse | null;
  login: (tokens: ExtendedAuthTokens, userDetails: UserDetailsResponse, sessionSeed?: string) => Promise<void>;
  logout: () => Promise<void>;
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

  // --- CLEANUP LEGACY PLAINTEXT STORAGE ---
  const wipeLegacyLocalStorage = () => {
    if (typeof window !== 'undefined') {localStorage.removeItem(AUTH_TOKEN_KEY);localStorage.removeItem(USER_KEY);localStorage.removeItem(USER_DETAILS_KEY);}
  };

  const clearAuthStorage = async () => {
    // Clears RAM, sessionStorage, and wipes IndexedDB ciphertext
    await clearSecuritySession();
    wipeLegacyLocalStorage();

    if (typeof (apiClient as any).setTokens === 'function') {
      await (apiClient as any).setTokens(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      wipeLegacyLocalStorage();

      // Skip session re-hydration if user is already on the login page
      if (window.location.pathname === '/login') {
        await clearAuthStorage();
        setIsLoading(false);
        return;
      }

      try {
        // 3. Check for active session seed in RAM or sessionStorage
        const currentSeed = getSessionSeed();

        if (!currentSeed) {
          await clearAuthStorage();
          setIsLoading(false);
          return;
        }

        // 4. Decrypt session tokens and user profile from IndexedDB using active seed
        const [storedTokens, storedUserDetails] = await Promise.all([
          retrieveAndDecrypt<AuthTokens>(AUTH_TOKEN_KEY),
          retrieveAndDecrypt<UserDetailsResponse>(USER_DETAILS_KEY),
        ]);

        if (storedTokens && storedUserDetails) {
          if (typeof (apiClient as any).setTokens === 'function') {
            await (apiClient as any).setTokens(storedTokens);
          }
          setUserDetails(storedUserDetails);
          setUser(storedUserDetails.user);
        } else {
          await clearAuthStorage();
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing security session:', error);
        await clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (tokens: ExtendedAuthTokens,userDetailsData: UserDetailsResponse,sessionSeed?: string) => {

    const activeSeed =
      sessionSeed ||
      tokens?.session_seed ||
      (userDetailsData as any)?.session_seed ||
      (userDetailsData as any)?.user?.session_seed ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2));
    setSessionSeed(activeSeed);

    // 2. Hydrate in-memory API client if supported
    if (typeof (apiClient as any).setTokens === 'function') {
      await (apiClient as any).setTokens(tokens);
    }

    // 3. Construct backward-compatible simplified user object
    const simplifiedUser = {
      id: userDetailsData.user.id.toString(),
      username: userDetailsData.user.username,
      email: userDetailsData.user.email,
      full_name: userDetailsData.user.full_name,
    };

    // 4. Encrypt and persist tokens, user details, and simplified user profile to IndexedDB
    await Promise.all([encryptAndStore(AUTH_TOKEN_KEY, tokens),encryptAndStore(USER_DETAILS_KEY, userDetailsData),encryptAndStore(USER_KEY, simplifiedUser),]);
    // 5. Update component state
    setUserDetails(userDetailsData);
    setUser(userDetailsData.user);
  };

  const logout = async () => {
    try {
      // Direct call to apiClient.logoutUser() to hit server endpoint
      await apiClient.logoutUser();
    } catch (error) {
      console.error('[AuthContext] Logout endpoint error:', error);
    } finally {
      await clearAuthStorage();
      setUser(null);
      setUserDetails(null);
      window.location.href = '/login';
    }
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
    return codenames.some((codename) => hasPermission(codename));
  };

  const hasAllPermissions = (codenames: string[]): boolean => {
    return codenames.every((codename) => hasPermission(codename));
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};