import { describe, expect, it, vi } from 'vitest';
import {
  buildRedirectUri,
  runAuthorizationFlow,
  toTokenData,
} from '../../../src/auth/authorize-flow.js';

vi.mock('../../../src/server/http-server.js', () => ({
  startCallbackServer: vi.fn(),
}));

vi.mock('../../../src/auth/oauth.js', async () => {
  const actual = await vi.importActual<typeof import('../../../src/auth/oauth.js')>(
    '../../../src/auth/oauth.js',
  );
  return {
    ...actual,
    exchangeCode: vi.fn(),
  };
});

import { exchangeCode } from '../../../src/auth/oauth.js';
import { startCallbackServer } from '../../../src/server/http-server.js';

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

describe('runAuthorizationFlow', () => {
  it('orchestrates full flow: callback server → exchange → save → return tokens', async () => {
    const stop = vi.fn();
    vi.mocked(startCallbackServer).mockResolvedValue({
      port: 54321,
      codePromise: Promise.resolve('test-code'),
      stop,
    });
    vi.mocked(exchangeCode).mockResolvedValue({
      access_token: 'access-X',
      refresh_token: 'refresh-X',
      expires_in: 86_400,
      token_type: 'bearer',
      scope: 'email',
    });
    const saveTokens = vi.fn().mockResolvedValue(undefined);
    const onAuthorizeUrl = vi.fn().mockResolvedValue(undefined);
    const registerFlow = vi.fn();

    const { authorizeUrl, completion } = await runAuthorizationFlow({
      clientId: 'cid',
      clientSecret: 'csec',
      callbackPort: 54321,
      saveTokens,
      onAuthorizeUrl,
      registerFlow,
      now: () => 1_000_000,
    });

    expect(authorizeUrl).toMatch(/^https:\/\/cloud\.ouraring\.com\/oauth\/authorize\?/);
    expect(authorizeUrl).toContain('client_id=cid');
    expect(authorizeUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A54321%2Fcallback');
    expect(onAuthorizeUrl).toHaveBeenCalledWith(authorizeUrl);
    expect(registerFlow).toHaveBeenCalledWith(
      expect.objectContaining({ state: expect.any(String), stop }),
    );

    const tokens = await completion;
    expect(tokens.access_token).toBe('access-X');
    expect(tokens.refresh_token).toBe('refresh-X');
    expect(tokens.expires_at).toBe(1_000_000 + 86_400_000);
    expect(saveTokens).toHaveBeenCalledWith(tokens);
    expect(exchangeCode).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'test-code', clientId: 'cid', clientSecret: 'csec' }),
    );
  });

  it('rejects when token endpoint returns no refresh_token', async () => {
    vi.mocked(startCallbackServer).mockResolvedValue({
      port: 54321,
      codePromise: Promise.resolve('code-no-rt'),
      stop: vi.fn(),
    });
    vi.mocked(exchangeCode).mockResolvedValue({
      access_token: 'a',
      expires_in: 86_400,
      token_type: 'bearer',
    });
    const { completion } = await runAuthorizationFlow({
      clientId: 'cid',
      clientSecret: 'csec',
      callbackPort: 54321,
      saveTokens: vi.fn(),
      onAuthorizeUrl: () => Promise.resolve(),
      now: () => 1_000_000,
    });
    await expect(completion).rejects.toThrow(/no refresh_token/);
  });
});
