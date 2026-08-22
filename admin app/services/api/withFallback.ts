/** §demo — every `services/api/*Api.ts` wrapper is a thin real-endpoint
 * call that falls back to a slice of `services/demo/mockData.ts` when the
 * shared backend is unreachable AND demo mode is on. Centralized here so
 * each wrapper reads as "real call, demo fallback" instead of repeating
 * the try/catch shape two dozen times. A non-network error (403, 422, …)
 * always propagates — demo mode only stands in for a missing backend, it
 * never hides a real authorization or validation failure. */
import { DEMO_MODE } from '@/constants/config';
import { isNetworkError } from './client';

export async function withFallback<T>(call: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (DEMO_MODE && isNetworkError(error)) return fallback();
    throw error;
  }
}
