import { describe, expect, it } from 'vitest';
import { PathSchema } from '../../../src/mcp/path-schema.js';

describe('PathSchema', () => {
  it.each([
    '/v2/usercollection/daily_sleep',
    '/v2/usercollection/heartrate',
    '/v2/usercollection/personal_info',
  ])('accepts %s', (p) => {
    expect(PathSchema.safeParse(p).success).toBe(true);
  });

  it.each<[string, string]>([
    ['/oauth/token', 'wrong prefix'],
    ['/v1/usercollection/daily_sleep', 'wrong version'],
    ['/v2/../oauth/token', 'parent traversal'],
    ['/v2/usercollection/%2E%2E/oauth', 'percent-encoded traversal lower'],
    ['/v2/usercollection/%2e%2E/oauth', 'percent-encoded traversal mixed'],
    ['/v2/path%2Foauth', 'percent-encoded slash'],
    ['/v2/path\\../', 'backslash'],
    ['/v2/path\nnewline', 'control char (newline)'],
    ['/v2/path\x00null', 'null byte'],
  ])('rejects %s (%s)', (p) => {
    expect(PathSchema.safeParse(p).success).toBe(false);
  });
});
