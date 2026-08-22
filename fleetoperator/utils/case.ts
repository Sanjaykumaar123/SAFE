/**
 * The backend speaks snake_case JSON (FastAPI/Pydantic convention); every
 * TS type in `types/` is camelCase. These two functions are the ONE place
 * that conversion happens (wired into services/api/client.ts interceptors)
 * so no screen or service ever sees a raw snake_case field.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export function keysToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => keysToCamel(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[snakeToCamel(key)] = keysToCamel(value);
    }
    return result as T;
  }
  return input as T;
}

export function keysToSnake(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => keysToSnake(item));
  }
  if (isPlainObject(input)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[camelToSnake(key)] = keysToSnake(value);
    }
    return result;
  }
  return input;
}
