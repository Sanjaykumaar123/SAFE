/**
 * The one centralized API client. No screen or service module calls
 * `fetch`/`axios` directly — everything goes through `apiClient` or a
 * `services/api/*` wrapper around it (§51: every admin action is
 * `Admin App -> FastAPI -> Authorization -> Business Logic -> DB
 * Transaction -> Audit Log -> Event -> Connected Systems`).
 *
 * This app is a pure HTTP client of the shared SafePath backend (never a
 * direct database connection, §80). Token refresh/logout reuse the
 * backend's role-agnostic `/auth/refresh` and `/auth/logout` — the same
 * endpoints every other SafePath app calls, since a refresh token is just
 * a revocable session row keyed by user id, independent of which app
 * issued it.
 */
import axios, { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { API_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { ApiError, TokenPair } from '@/types/api';
import { keysToCamel, keysToSnake } from '@/utils/case';

let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccessToken();
  if (token && !token.startsWith('demo-')) {
    config.headers = config.headers ?? new AxiosHeaders();
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  if (config.data && !(config.data instanceof FormData)) {
    config.data = keysToSnake(config.data);
  }
  if (config.params) {
    config.params = keysToSnake(config.params);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    response.data = keysToCamel(response.data);
    return response;
  },
  (error) => Promise.reject(error)
);

// --- 401 handling: refresh once, retry the original request once. ---
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken || refreshToken.startsWith('demo-')) return null;
  try {
    const response = await axios.post<{ access_token: string; refresh_token: string; token_type: string }>(
      `${API_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: REQUEST_TIMEOUT_MS }
    );
    const tokens = keysToCamel<TokenPair>(response.data);
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    await tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

  const token = await tokenStorage.getAccessToken();
  const isDemoToken = token?.startsWith('demo-');

  if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
    original._retried = true;
    if (isDemoToken) {
      return Promise.reject(error);
    }
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      original.headers = original.headers ?? new AxiosHeaders();
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return apiClient.request(original);
    }
    onSessionExpired?.();
  }
  return Promise.reject(error);
});

/** §81 — maps every status code the spec calls out to an admin-friendly
 * message. Screens read `.message`/`.status`, never a raw axios error. */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return { status: null, message: 'You appear to be offline. Showing the last cached data.', isNetworkError: true };
    }
    const data = error.response.data as { detail?: string } | undefined;
    const status = error.response.status;
    const fallback = STATUS_MESSAGES[status] ?? data?.detail ?? 'Something went wrong. Please try again.';
    return { status, message: data?.detail ?? fallback, isNetworkError: false };
  }
  return { status: null, message: 'An unexpected error occurred.', isNetworkError: false };
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'This record could not be found.',
  409: 'This record was changed by another administrator. Refresh and review the latest version.',
  422: 'Some of the submitted data was invalid.',
  429: 'Too many requests — please slow down and try again shortly.',
  500: 'SafePath service encountered an internal error.',
  503: 'SafePath service is temporarily unavailable.',
};

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error'));
}
