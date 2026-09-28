// lib/notify.ts
// Notification-service client. It shares the main API client's token state, refresh flow
// and logout (see attachAuthInterceptors in api.ts) instead of running a second copy.
import axios, { AxiosInstance } from 'axios';
import { NOTIFY_BASE_URL, OUT_NOTIFY_BASE_URL } from './constants';
import { AuthTokens, UserDetailsResponse } from '@/types';
import { apiClient as authClient, resolveBaseUrl, REQUEST_TIMEOUT_MS } from './api';

const client: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(NOTIFY_BASE_URL, OUT_NOTIFY_BASE_URL),
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

authClient.attachAuthInterceptors(client);

export const notifyClient = {
  getClient: (): AxiosInstance => client,

  get: async <T>(url: string, params?: any): Promise<T> => (await client.get<T>(url, { params })).data,
  post: async <T>(url: string, data?: any): Promise<T> => (await client.post<T>(url, data)).data,
  put: async <T>(url: string, data?: any): Promise<T> => (await client.put<T>(url, data)).data,
  patch: async <T>(url: string, data?: any): Promise<T> => (await client.patch<T>(url, data)).data,
  delete: async <T>(url: string): Promise<T> => (await client.delete<T>(url)).data,

  getUserDetails: async (): Promise<UserDetailsResponse> => (await client.get('/users/me/')).data,

  // Auth is owned by the main API client — these delegate so existing imports keep working.
  login: (username: string, password: string): Promise<AuthTokens> => authClient.login(username, password),
  logoutUser: (): Promise<void> => authClient.logoutUser(),
  setTokens: (tokens: AuthTokens | null): Promise<void> => authClient.setTokens(tokens),
  isAuthenticated: (): boolean => authClient.isAuthenticated(),
  getCurrentTokens: (): AuthTokens | null => authClient.getCurrentTokens(),
};

/** Backwards-compatible name used by notificationApi and elsewhere. */
export const apiClient = notifyClient;