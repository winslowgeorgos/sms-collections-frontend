// lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, OUT_API_BASE_URL, AUTH_TOKEN_KEY, USER_KEY, USER_DETAILS_KEY } from './constants';
import { AuthTokens } from '@/types';
import {encryptAndStore,retrieveAndDecrypt,removeFromDataStore,setSessionSeed,clearSecuritySession,} from '@/utils/sec';

// Helper function to determine which base URL to use
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if the browser route reads 10.24.1.1
    console.log("hostname : ", hostname)
    if (hostname === '10.24.1.1') {
      return OUT_API_BASE_URL;
    }
  }
  return API_BASE_URL;
};

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  
  // In-memory token cache to support synchronous Axios request interceptors
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

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          return Promise.reject(new Error('Network error. Please check your connection.'));
        }

        // Handle 401 Unauthorized (token refresh)
        if (error.response?.status === 401 && !originalRequest._retry) {
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
            this.onRefreshFailure();
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

        if (error.response?.status === 400) {
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // --- VAULT SYNC METHODS ---
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
      const response = await axios.post(`${getBaseUrl()}/token/refresh/`, {
        refresh: this.cachedTokens.refresh,
      });

      // Capture new session seed if returned on refresh
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

  private onRefreshFailure() {
    this.refreshSubscribers = [];
    this.isRefreshing = false;
    this.logoutUser();
  }

  // Public logout routine that purges vault data
  public async logoutUser(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. Instantly clear in-memory tokens and active security session
      clearSecuritySession();
      this.cachedTokens = null;

      // 2. Purge client-side persistent vault storage (IndexedDB / LocalStorage)
      await Promise.all([
        removeFromDataStore(AUTH_TOKEN_KEY),
        removeFromDataStore(USER_KEY),
        removeFromDataStore(USER_DETAILS_KEY),
      ]);

      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  // Public methods
  public async login(username: string, password: string): Promise<AuthTokens> {
    try {
      const response = await this.client.post('/token/', {
        username,
        password,
      });

      // Extract session seed from login response
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

  // Request password reset link by sending an email address
  public async requestPasswordReset(email: string): Promise<{ detail: string }> {
    try {
      const response = await this.client.post<{ detail: string }>('/auth/password/request/', { email });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  }

  // Submit the new password alongside token credentials
  public async confirmPasswordReset(data: Record<string, string>): Promise<{ detail: string }> {
    try {
      const response = await this.client.post<{ detail: string }>('/auth/password/confirm/', {
        uid: data.uid,
        token: data.token,
        new_password: data.newPassword,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  }

  public async getUserDetails(): Promise<any> {
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

  public isAuthenticated(): boolean {
    return !!(this.cachedTokens?.access);
  }

  public getCurrentTokens(): AuthTokens | null {
    return this.cachedTokens;
  }
}

export const apiClient = new APIClient();