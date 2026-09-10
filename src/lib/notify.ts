import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { OUT_NOTIFY_BASE_URL, NOTIFY_BASE_URL, AUTH_TOKEN_KEY, USER_KEY, USER_DETAILS_KEY } from './constants';
import { AuthTokens, UserDetailsResponse } from '@/types';
import {encryptAndStore,retrieveAndDecrypt,removeFromDataStore,setSessionSeed,clearSecuritySession,} from '@/utils/sec';

// Helper function to determine which base URL to use
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if the browser route reads 10.24.1.1
    console.log("hostname : ", hostname)
    if (hostname === '10.24.1.1') {
      return OUT_NOTIFY_BASE_URL;
    }
  }
  return NOTIFY_BASE_URL;
};

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  // In-memory token cache for high-performance, synchronous-like request interceptors
  private cachedTokens: AuthTokens | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: getBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 210000, // 30 seconds timeout
    });

    this.setupInterceptors();
    this.initializeCache();
  }

  /**
   * Hydrates memory cache from encrypted IndexedDB vault on startup.*/
  private async initializeCache(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) return;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          const tokens = await retrieveAndDecrypt<AuthTokens>(AUTH_TOKEN_KEY);
          if (tokens) {
            this.cachedTokens = tokens;
          }
        } catch (error) {
          console.error('[APIClient] Error initializing token cache from vault:', error);
        } finally {
          this.isInitialized = true;
        }
      })();
    }

    return this.initPromise;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Guarantee token cache hydration completes before any request dispatches
        if (!this.isInitialized && typeof window !== 'undefined') {
          await this.initializeCache();
        }

        if (this.cachedTokens?.access) {
          config.headers.Authorization = `Bearer ${this.cachedTokens.access}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        const requestUrl = originalRequest?.url || '';
        const isAuthRequest = requestUrl.includes('token/');

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          return Promise.reject(new Error('Network error. Please check your connection.'));
        }

        // Handle 401 Unauthorized (token refresh)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          if (!this.cachedTokens?.refresh) {
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const tokens = await this.refreshToken();
            if (tokens) {
              this.onRefreshSuccess(tokens.access);
              originalRequest.headers.Authorization = `Bearer ${tokens.access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            await this.onRefreshFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle other common HTTP errors
        if (error.response?.status >= 500) {
          console.error('Server error:', error.response.data);
          return Promise.reject(new Error('Server error. Please try again later.'));
        }

        if (error.response?.status === 404) {
          console.error('Resource not found:', error.config?.url);
          return Promise.reject(new Error('Requested resource not found.'));
        }

        if (error.response?.status === 403) {
          console.error('Forbidden:', error.response.data);
          return Promise.reject(new Error('You do not have permission to perform this action.'));
        }

        // For validation errors (400), pass through response data
        if (error.response?.status === 400) {
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // Synchronizes in-memory cache with the encrypted IndexedDB vault
  public async setTokens(tokens: AuthTokens | null): Promise<void> {
    this.cachedTokens = tokens;
    if (typeof window === 'undefined') return;

    if (tokens) {
      await encryptAndStore(AUTH_TOKEN_KEY, tokens);
    } else {
      await removeFromDataStore(AUTH_TOKEN_KEY);
    }
  }

  private async refreshToken(): Promise<AuthTokens | null> {
    if (!this.cachedTokens?.refresh) {
      await this.logoutUser();
      return null;
    }

    try {
      const response = await axios.post(
        `${getBaseUrl()}/token/refresh/`,
        { refresh: this.cachedTokens.refresh }
      );

      // Bind dynamic session seed if returned by backend
      if (response.data?.session_seed) {
        setSessionSeed(response.data.session_seed);
      }

      const newTokens: AuthTokens = {
        access: response.data.access,
        refresh: response.data.refresh || this.cachedTokens.refresh,
      };

      await this.setTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logoutUser();
      throw error;
    }
  }

  private onRefreshSuccess(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
    this.isRefreshing = false;
  }

  private async onRefreshFailure() {
    this.refreshSubscribers = [];
    this.isRefreshing = false;
    await this.logoutUser();
  }

  // AUDIT FIX: Guaranteed multi-stage cleanup before redirect
  public async logoutUser(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Optional: Notify backend to invalidate refresh token
      await this.client.post('/logout/').catch(() => {});
    } finally {
      try {
        // Clear Web Crypto session context and memory cache
        clearSecuritySession();
        this.cachedTokens = null;

        // Ensure all sensitive records are purged from IndexedDB in parallel
        await Promise.all([
          removeFromDataStore(AUTH_TOKEN_KEY),
          removeFromDataStore(USER_KEY),
          removeFromDataStore(USER_DETAILS_KEY),
        ]);
      } catch (error) {
        console.error('Error during storage cleanup on logout:', error);
      } finally {
        // Only redirect after client storage clearance finishes
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
  }

  // --- PUBLIC API METHODS ---

  public async login(username: string, password: string): Promise<AuthTokens> {
    try {
      this.isRefreshing = false;
      this.refreshSubscribers = [];

      const response = await this.client.post('/token/', {
        username,
        password,
      });

      // Synchronize key derivation seed for Web Crypto AES-GCM vault
      const sessionSeed = response.data?.session_seed || response.data?.user?.session_seed;
      if (sessionSeed) {
        setSessionSeed(sessionSeed);
      }

      const tokens: AuthTokens = {
        access: response.data.access,
        refresh: response.data.refresh,
      };

      await this.setTokens(tokens);
      return tokens;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw error;
    }
  }

  public async getUserDetails(): Promise<UserDetailsResponse> {
    try {
      const response = await this.client.get('/users/me/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      throw error;
    }
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  // Helper method for common API patterns
  public async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Instant synchronous memory-backed checks
  public isAuthenticated(): boolean {
    return !!(this.cachedTokens?.access);
  }

  public getCurrentTokens(): AuthTokens | null {
    return this.cachedTokens;
  }
}

export const apiClient = new APIClient();