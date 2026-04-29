import { describe, expect, it } from 'vitest';
import {
  buildAuthorizeUrl,
  OuraOAuthError,
  RefreshTokenExpiredError,
} from '../../../src/auth/oauth.js';

describe('buildAuthorizeUrl', () => {
  it('includes all required OAuth params + PKCE', () => {
    const url = buildAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'http://localhost:54321/callback',
      scope: 'personal daily',
      state: 'xyz',
      codeChallenge: 'abc',
    });
    const u = new URL(url);
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('client_id')).toBe('cid');
    expect(u.searchParams.get('scope')).toBe('personal daily');
    expect(u.searchParams.get('state')).toBe('xyz');
    expect(u.searchParams.get('code_challenge')).toBe('abc');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('redirect_uri')).toBe('http://localhost:54321/callback');
  });
});

describe('Custom errors', () => {
  it('RefreshTokenExpiredError is named Error', () => {
    const e = new RefreshTokenExpiredError();
    expect(e.name).toBe('RefreshTokenExpiredError');
    expect(e instanceof Error).toBe(true);
  });

  it('OuraOAuthError captures status and body', () => {
    const e = new OuraOAuthError('token endpoint 400', 400, { error: 'invalid_request' });
    expect(e.status).toBe(400);
    expect(e.body).toEqual({ error: 'invalid_request' });
    expect(e.name).toBe('OuraOAuthError');
  });
});
