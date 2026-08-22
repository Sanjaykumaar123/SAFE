/**
 * The one centralized API client. No screen or service module calls
 * `fetch`/`axios` directly — everything goes through `apiClient` or a
 * `services/api/*` wrapper around it.
 *
 * This app is a pure HTTP client of the shared SafePath backend (never a
 * direct database connection). Token refresh/logout reuse the backend's
 * role-agnostic `/auth/refresh` and `/auth/logout` — the same endpoints
 * every other SafePath app calls, since a refresh token is just a
 * revocable session row keyed by user id, independent of which app
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
  if (token) {
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
  if (!refreshToken) return null;
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

  if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
    original._retried = true;
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

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return { status: null, message: 'You appear to be offline. Queued data will sync automatically.', isNetworkError: true };
    }
    const data = error.response.data as { detail?: string } | undefined;
    return {
      status: error.response.status,
      message: data?.detail ?? 'Something went wrong. Please try again.',
      isNetworkError: false,
    };
  }
  return { status: null, message: 'An unexpected error occurred.', isNetworkError: false };
}
