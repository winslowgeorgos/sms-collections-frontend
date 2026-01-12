// lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, AUTH_TOKEN_KEY, USER_KEY } from './constants';
import { AuthTokens } from '@/types';

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 210000, // 30 seconds timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const tokens = this.getStoredTokens();
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
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

        // For validation errors, pass through the response data
        if (error.response?.status === 400) {
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private getStoredTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    try {
      const tokens = localStorage.getItem(AUTH_TOKEN_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error reading tokens from localStorage:', error);
      return null;
    }
  }

  private setStoredTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error storing tokens in localStorage:', error);
    }
  }

  private async refreshToken(): Promise<AuthTokens | null> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refresh) {
      this.logout();
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
        refresh: tokens.refresh,
      });

      const newTokens: AuthTokens = {
        access: response.data.access,
        refresh: tokens.refresh, // Keep the original refresh token
      };

      this.setStoredTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
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
    this.logout();
  }

  private logout() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
      
      const tokens: AuthTokens = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      
      this.setStoredTokens(tokens);
      return tokens;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw error;
    }
  }

  public async logoutUser(): Promise<void> {
    try {
      // Call logout endpoint if available
      await this.client.post('/logout/');
    } catch (error) {
      console.error('Logout endpoint error:', error);
    } finally {
      this.logout();
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

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!(tokens?.access);
  }

  // Get current user tokens
  public getCurrentTokens(): AuthTokens | null {
    return this.getStoredTokens();
  }
}

export const apiClient = new APIClient();