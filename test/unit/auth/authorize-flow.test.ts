import { describe, expect, it } from 'vitest';
import { buildRedirectUri, toTokenData } from '../../../src/auth/authorize-flow.js';

describe('buildRedirectUri', () => {
  it('uses localhost (Oura accepts only localhost for HTTP loopback)', () => {
    expect(buildRedirectUri(54321)).toBe('http://localhost:54321/callback');
  });

  it('honors custom port', () => {
    expect(buildRedirectUri(8080)).toBe('http://localhost:8080/callback');
  });
});

describe('toTokenData', () => {
  it('builds TokenData from TokenResponse + now', () => {
    const t = toTokenData(
      {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 100,
        token_type: 'bearer',
        scope: 'extapi:personal',
      },
      null,
      1_000_000,
    );
    expect(t.schemaVersion).toBe(1);
    expect(t.access_token).toBe('a');
    expect(t.refresh_token).toBe('r');
    expect(t.expires_at).toBe(1_000_000 + 100_000);
    expect(t.obtained_at).toBe(1_000_000);
    expect(t.token_type).toBe('bearer');
    expect(t.scope).toBe('extapi:personal');
  });

  it('preserves prev refresh_token when response omits it', () => {
    const t = toTokenData(
      { access_token: 'a2', expires_in: 100, token_type: 'bearer' },
      {
        schemaVersion: 1,
        access_token: 'a',
        refresh_token: 'r1',
        expires_at: 0,
        token_type: 'bearer',
        scope: 'extapi:personal',
        obtained_at: 0,
      },
      1_000_000,
    );
    expect(t.refresh_token).toBe('r1');
    expect(t.scope).toBe('extapi:personal');
  });

  it('falls back to default scope when no source provided', () => {
    const t = toTokenData(
      { access_token: 'a', refresh_token: 'r', expires_in: 100, token_type: 'bearer' },
      null,
      1_000_000,
    );
    expect(t.scope).toContain('email');
  });
});
