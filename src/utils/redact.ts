const SENSITIVE_KEYS = new Set([
  'access_token',
  'refresh_token',
  'client_secret',
  'code',
  'code_verifier',
  'authorization',
]);

export function redact<T>(value: T): T {
  return redactInternal(value) as T;
}

function redactInternal(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactInternal);
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = typeof val === 'string' && val.length > 0 ? '***' : val;
    } else {
      result[key] = redactInternal(val);
    }
  }
  return result;
}
