import { describe, expect, it } from 'vitest';
import { OuraApiError } from '../../../src/api/errors.js';

describe('OuraApiError', () => {
  it('captures status and body', () => {
    const e = new OuraApiError(429, 'rate limited');
    expect(e.status).toBe(429);
    expect(e.body).toBe('rate limited');
    expect(e.name).toBe('OuraApiError');
    expect(e instanceof Error).toBe(true);
  });

  it('serializes message with status', () => {
    const e = new OuraApiError(401, { message: 'unauthorized' });
    expect(e.message).toContain('401');
  });
});
