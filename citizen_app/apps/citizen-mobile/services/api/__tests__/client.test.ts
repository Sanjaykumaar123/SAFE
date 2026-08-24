import { toApiError } from '../client';

/** Section 47: every async operation needs a normalized error shape so
 * screens render a consistent message regardless of what axios threw. */
describe('toApiError', () => {
  it('flags a network error (no response) as offline, with friendly copy', () => {
    const error = { isAxiosError: true, response: undefined };
    const result = toApiError(error);
    expect(result.isNetworkError).toBe(true);
    expect(result.status).toBeNull();
    expect(result.message).toMatch(/offline/i);
  });

  it('extracts the backend detail message from a 4xx/5xx response', () => {
    const error = { isAxiosError: true, response: { status: 409, data: { detail: 'An account with this email or phone already exists.' } } };
    const result = toApiError(error);
    expect(result.isNetworkError).toBe(false);
    expect(result.status).toBe(409);
    expect(result.message).toBe('An account with this email or phone already exists.');
  });

  it('falls back to a generic message when the response has no detail field', () => {
    const error = { isAxiosError: true, response: { status: 500, data: {} } };
    const result = toApiError(error);
    expect(result.message).toBe('Something went wrong. Please try again.');
  });

  it('handles a completely unexpected non-axios error', () => {
    const result = toApiError(new Error('boom'));
    expect(result.isNetworkError).toBe(false);
    expect(result.status).toBeNull();
    expect(result.message).toBe('An unexpected error occurred.');
  });
});
