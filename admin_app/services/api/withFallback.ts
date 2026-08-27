export async function withFallback<T>(call: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    return fallback();
  }
}
