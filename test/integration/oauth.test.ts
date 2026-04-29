import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  exchangeCode,
  OuraOAuthError,
  RefreshTokenExpiredError,
  refreshTokens,
} from '../../src/auth/oauth.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('exchangeCode (integration)', () => {
  it('returns tokens on success', async () => {
    server.use(
      http.post('https://api.ouraring.com/oauth/token', () =>
        HttpResponse.json({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 86400,
          token_type: 'bearer',
          scope: 'extapi:personal',
        }),
      ),
    );
    const t = await exchangeCode({
      code: 'c',
      codeVerifier: 'v',
      clientId: 'i',
      clientSecret: 's',
      redirectUri: 'http://localhost:54321/callback',
    });
    expect(t.access_token).toBe('a');
    expect(t.token_type).toBe('bearer');
  });

  it('throws OuraOAuthError on non-200', async () => {
    server.use(
      http.post('https://api.ouraring.com/oauth/token', () =>
        HttpResponse.json({ error: 'invalid_request' }, { status: 400 }),
      ),
    );
    await expect(
      exchangeCode({
        code: 'c',
        codeVerifier: 'v',
        clientId: 'i',
        clientSecret: 's',
        redirectUri: 'http://localhost:54321/callback',
      }),
    ).rejects.toBeInstanceOf(OuraOAuthError);
  });
});

describe('refreshTokens (integration)', () => {
  it('throws RefreshTokenExpiredError on invalid_grant', async () => {
    server.use(
      http.post('https://api.ouraring.com/oauth/token', () =>
        HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }),
      ),
    );
    await expect(
      refreshTokens({ refreshToken: 'r', clientId: 'i', clientSecret: 's' }),
    ).rejects.toBeInstanceOf(RefreshTokenExpiredError);
  });

  it('returns rotated refresh_token when present', async () => {
    server.use(
      http.post('https://api.ouraring.com/oauth/token', () =>
        HttpResponse.json({
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 86400,
          token_type: 'bearer',
        }),
      ),
    );
    const t = await refreshTokens({
      refreshToken: 'r1',
      clientId: 'i',
      clientSecret: 's',
    });
    expect(t.refresh_token).toBe('r2');
  });
});
