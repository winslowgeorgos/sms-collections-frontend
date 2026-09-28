// lib/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, OUT_API_BASE_URL, AUTH_TOKEN_KEY } from './constants';
import { AuthTokens } from '@/types';
import {
  encryptAndStore,
  retrieveAndDecrypt,
  removeFromDataStore,
  setSessionSeed,
  rotateSessionSeed,
  getSessionSeed,
  clearSecuritySession,
  SESSION_CLEARED_EVENT,
  SESSION_UPDATED_EVENT,
} from '@/utils/sec';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const EXTERNAL_HOST = '10.24.1.1';
export const REQUEST_TIMEOUT_MS = 210_000; // 3.5 min — long-running report endpoints
const REFRESH_TIMEOUT_MS = 30_000;
const REFRESH_LOCK_NAME = 'sms-collections-token-refresh';
const LOGIN_PATH = '/login';

// Requests that must never carry a bearer token or trigger a refresh/retry loop.
const AUTH_PATH_PREFIXES = ['/token/', '/auth/password/'];

/** Pick internal vs external base URL based on how the app was reached. */
export const resolveBaseUrl = (internalUrl: string, externalUrl: string): string =>
  typeof window !== 'undefined' && window.location.hostname === EXTERNAL_HOST ? externalUrl : internalUrl;

const getBaseUrl = (): string => resolveBaseUrl(API_BASE_URL, OUT_API_BASE_URL);

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isAuthEndpoint(url = ''): boolean {
  return AUTH_PATH_PREFIXES.some((p) => url.startsWith(p));
}

function bearerFrom(header: unknown): string | null {
  const value = typeof header === 'string' ? header : '';
  return value.replace(/^Bearer\s+/i, '') || null;
}

/** True when a JWT's `exp` is in the past (with a small safety margin). Unknown → false. */
function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return false;
  }
}

/** Keep the AxiosError (status, response data) but give it a user-facing message. */
function withMessage(error: AxiosError, message: string): AxiosError {
  error.message = message;
  return error;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
class APIClient {
  private readonly client: AxiosInstance;

  // In-memory token cache; the encrypted vault is the source of truth shared by all tabs.
  private cachedTokens: AuthTokens | null = null;
  // Bumped on every login/logout/external session change so in-flight vault reads can't
  // resurrect tokens that were cleared while they were running.
  private authEpoch = 0;

  private loadPromise: Promise<AuthTokens | null> | null = null;
  private refreshPromise: Promise<AuthTokens | null> | null = null;
  private logoutPromise: Promise<void> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: getBaseUrl(),
      headers: { 'Content-Type': 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    });

    this.attachAuthInterceptors(this.client);

    if (typeof window !== 'undefined') {
      void this.loadTokensFromVault();

      // Another tab logged out → drop tokens and leave.
      window.addEventListener(SESSION_CLEARED_EVENT, () => {
        this.dropCachedTokens();
        this.redirectToLogin();
      });
      // Another tab logged in / refreshed with a new seed → re-read the vault on next request.
      window.addEventListener(SESSION_UPDATED_EVENT, () => this.dropCachedTokens());
    }
  }

  // --- Token state -----------------------------------------------------------

  private dropCachedTokens(): void {
    this.authEpoch++;
    this.cachedTokens = null;
  }

  /** Reads tokens from the encrypted vault (deduplicated). Never throws. */
  private loadTokensFromVault(): Promise<AuthTokens | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (this.loadPromise) return this.loadPromise;

    const epoch = this.authEpoch;
    this.loadPromise = retrieveAndDecrypt<AuthTokens>(AUTH_TOKEN_KEY)
      .catch((error) => {
        console.error('[APIClient] Error reading tokens from vault:', error);
        return null;
      })
      .then((tokens) => {
        if (tokens?.access && epoch === this.authEpoch) this.cachedTokens = tokens;
        return tokens?.access ? tokens : null;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  /** Current access token; falls back to the vault if this tab has nothing cached yet. */
  public async getAccessToken(): Promise<string | null> {
    const tokens = this.cachedTokens ?? (await this.loadTokensFromVault());
    return tokens?.access ?? null;
  }

  public async setTokens(tokens: AuthTokens | null): Promise<void> {
    this.authEpoch++;
    this.cachedTokens = tokens;
    if (typeof window === 'undefined') return;

    if (tokens) {
      await encryptAndStore(AUTH_TOKEN_KEY, tokens);
    } else {
      await removeFromDataStore(AUTH_TOKEN_KEY);
    }
  }

  // --- Interceptors (shared with other service clients, e.g. notify.ts) -------

  /**
   * Installs bearer-token + refresh handling on any axios instance, so every service
   * client shares ONE token state and ONE refresh flow.
   */
  public attachAuthInterceptors(instance: AxiosInstance): void {
    instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      if (isAuthEndpoint(config.url)) return config;

      let token = await this.getAccessToken();

      // Refresh proactively instead of burning a round-trip on a guaranteed 401.
      if (token && isJwtExpired(token)) {
        const refreshed = await this.refreshAccessToken(token);
        token = refreshed?.access ?? token;
      }

      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (axios.isCancel(error)) return Promise.reject(error);

        const original = error.config as RetriableConfig | undefined;

        if (!error.response) {
          if (error.code === 'ECONNABORTED') {
            console.error('Request timed out:', original?.url);
            return Promise.reject(withMessage(error, 'The request timed out. Please try again.'));
          }
          console.error('Network error:', error.message);
          return Promise.reject(withMessage(error, 'Network error. Please check your connection.'));
        }

        const status = error.response.status;

        if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
          original._retry = true;
          const tokens = await this.refreshAccessToken(bearerFrom(original.headers?.Authorization));
          if (tokens?.access) {
            original.headers.Authorization = `Bearer ${tokens.access}`;
            return instance(original);
          }
          return Promise.reject(withMessage(error, 'Your session has expired. Please log in again.'));
        }

        if (status >= 500) {
          console.error(
            `Server error ${status} on ${original?.method?.toUpperCase()} ${original?.baseURL ?? ''}${original?.url ?? ''}:`,
            error.response.data
          );
          return Promise.reject(withMessage(error, 'Server error. Please try again later.'));
        }

        if (status === 404) {
          console.error('Resource not found:', original?.url);
          return Promise.reject(withMessage(error, 'Requested resource not found.'));
        }

        if (status === 403) {
          console.error('Forbidden:', error.response.data);
          return Promise.reject(withMessage(error, 'You do not have permission to perform this action.'));
        }

        // 400 and everything else: pass through untouched (callers read response.data).
        return Promise.reject(error);
      }
    );
  }

  // --- Refresh -----------------------------------------------------------------

  /**
   * Single-flight refresh. Concurrent callers in this tab share one promise; across tabs a
   * Web Lock serialises refreshes so a rotated refresh token is never replayed.
   * Resolves to null (never rejects) when no valid session can be obtained.
   */
  public refreshAccessToken(failedAccessToken: string | null = null): Promise<AuthTokens | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.withRefreshLock(() => this.performRefresh(failedAccessToken)).finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(REFRESH_LOCK_NAME, fn) as Promise<T>;
    }
    return fn();
  }

  private async performRefresh(failedAccessToken: string | null): Promise<AuthTokens | null> {
    // Another tab (or an earlier call) may have refreshed already — reuse its tokens.
    const stored = await this.loadTokensFromVault();
    if (stored?.access && stored.access !== failedAccessToken && !isJwtExpired(stored.access)) {
      return stored;
    }

    const refresh = stored?.refresh ?? this.cachedTokens?.refresh;
    if (!refresh) {
      // Nothing to refresh with: this tab simply isn't logged in. Don't wipe other tabs.
      this.redirectToLogin();
      return null;
    }

    try {
      const { data } = await axios.post(
        `${getBaseUrl()}/token/refresh/`,
        { refresh },
        { timeout: REFRESH_TIMEOUT_MS }
      );

      if (data?.session_seed && data.session_seed !== getSessionSeed()) {
        await rotateSessionSeed(data.session_seed); // re-encrypts user_details etc.
      }

      const tokens: AuthTokens = { access: data.access, refresh: data.refresh || refresh };
      await this.setTokens(tokens);
      return tokens;
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      if (status === 400 || status === 401) {
        console.warn('Refresh token rejected; logging out.');
        await this.logoutUser();
      } else {
        // Network blip / 5xx: keep the session, let the caller surface the error.
        console.error('Token refresh failed:', error);
      }
      return null;
    }
  }

  // --- Session lifecycle -----------------------------------------------------------

  private redirectToLogin(): void {
    if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
      window.location.href = LOGIN_PATH;
    }
  }

  /** Clears tokens + vault in every tab, then redirects. Safe to call concurrently. */
  public logoutUser(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.logoutPromise) return this.logoutPromise;

    this.logoutPromise = (async () => {
      this.dropCachedTokens();
      try {
        await clearSecuritySession(); // wipes the whole vault (tokens, user, user_details)
      } catch (error) {
        console.error('Error during logout cleanup:', error);
      } finally {
        this.redirectToLogin();
      }
    })().finally(() => {
      this.logoutPromise = null;
    });

    return this.logoutPromise;
  }

  public async login(username: string, password: string): Promise<AuthTokens> {
    let data: any;
    try {
      ({ data } = await this.client.post('/token/', { username, password }));
    } catch (error: any) {
      if (error.response?.status === 401) throw new Error('Invalid username or password');
      throw error;
    }

    const sessionSeed: string | undefined = data?.session_seed || data?.user?.session_seed;
    if (sessionSeed) {
      setSessionSeed(sessionSeed);
    } else if (!getSessionSeed()) {
      throw new Error('Login succeeded but the server did not return a session seed.');
    }

    const tokens: AuthTokens = { access: data.access, refresh: data.refresh };
    await this.setTokens(tokens);
    return tokens;
  }

  // --- Public API methods ----------------------------------------------------------

  public async requestPasswordReset(email: string): Promise<{ detail: string }> {
    try {
      const response = await this.client.post<{ detail: string }>('/auth/password/request/', { email });
      return response.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  }

  public async confirmPasswordReset(data: Record<string, string>): Promise<{ detail: string }> {
    try {
      const response = await this.client.post<{ detail: string }>('/auth/password/confirm/', {
        uid: data.uid,
        token: data.token,
        new_password: data.newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
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
    return (await this.client.get<T>(url, { params })).data;
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    return (await this.client.post<T>(url, data)).data;
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    return (await this.client.put<T>(url, data)).data;
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    return (await this.client.patch<T>(url, data)).data;
  }

  public async delete<T>(url: string): Promise<T> {
    return (await this.client.delete<T>(url)).data;
  }

  /** Synchronous, cache-only check. Prefer `hasSession()` in guards on first render. */
  public isAuthenticated(): boolean {
    return !!this.cachedTokens?.access;
  }

  /** Async check that also consults the vault (works in freshly opened tabs). */
  public async hasSession(): Promise<boolean> {
    return (await this.getAccessToken()) !== null;
  }

  public getCurrentTokens(): AuthTokens | null {
    return this.cachedTokens;
  }
}

export const apiClient = new APIClient();