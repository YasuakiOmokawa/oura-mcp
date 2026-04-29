import { describe, expect, it } from 'vitest';
import { redact } from '../../../src/utils/redact.js';

describe('redact', () => {
  it('replaces sensitive top-level keys with ***', () => {
    expect(redact({ access_token: 'abc', expires_at: 100 })).toEqual({
      access_token: '***',
      expires_at: 100,
    });
  });

  it('handles nested objects recursively', () => {
    expect(redact({ data: { refresh_token: 'r' } })).toEqual({
      data: { refresh_token: '***' },
    });
  });

  it('handles arrays', () => {
    expect(redact([{ access_token: 'a' }])).toEqual([{ access_token: '***' }]);
  });

  it('is case-insensitive on keys', () => {
    expect(redact({ Authorization: 'Bearer X' })).toEqual({ Authorization: '***' });
  });

  it('passes through primitives', () => {
    expect(redact('hello')).toBe('hello');
    expect(redact(123)).toBe(123);
    expect(redact(null)).toBe(null);
  });

  it('does not redact empty strings (already empty)', () => {
    expect(redact({ access_token: '' })).toEqual({ access_token: '' });
  });

  it('redacts code and code_verifier (PKCE)', () => {
    expect(redact({ code: 'abc', code_verifier: 'xyz' })).toEqual({
      code: '***',
      code_verifier: '***',
    });
  });
});
