import { describe, expect, it, vi } from 'vitest';
import { createAuthManager } from '../../../src/auth/auth-manager.js';
import { RefreshTokenExpiredError } from '../../../src/auth/oauth.js';
import type { TokenData } from '../../../src/auth/tokens.js';

function makeTokens(overrides: Partial<TokenData> = {}): TokenData {
  return {
    schemaVersion: 1,
    access_token: 'a',
    refresh_token: 'r',
    expires_at: Date.now() + 1_000_000,
    token_type: 'bearer',
    scope: 'extapi:personal',
    obtained_at: Date.now(),
    ...overrides,
  };
}

describe('createAuthManager', () => {
  it('returns access_token when not expired', async () => {
    const tokens = makeTokens();
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    expect(await mgr.getValidAccessToken()).toBe('a');
  });

  it('refreshes when token expired', async () => {
    const tokens = makeTokens({ expires_at: 100 });
    const refresh = vi.fn().mockResolvedValue({
      access_token: 'a2',
      refresh_token: 'r2',
      expires_in: 86400,
      token_type: 'bearer',
    });
    const save = vi.fn();
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save,
      clear: vi.fn(),
      refresh,
      now: () => 1_000_000,
    });
    expect(await mgr.getValidAccessToken()).toBe('a2');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'a2', refresh_token: 'r2' }),
    );
  });

  it('shares inflight refresh among concurrent calls', async () => {
    const tokens = makeTokens({ expires_at: 100 });
    let resolveFn: (v: unknown) => void = () => {};
    const refreshPromise = new Promise((r) => {
      resolveFn = r;
    });
    const refresh = vi.fn().mockImplementation(() => refreshPromise);
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save: vi.fn(),
      clear: vi.fn(),
      refresh,
      now: () => 1_000_000,
    });
    const p1 = mgr.getValidAccessToken();
    const p2 = mgr.getValidAccessToken();
    resolveFn({ access_token: 'a3', expires_in: 86400, token_type: 'bearer' });
    await Promise.all([p1, p2]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes at boundary: now + buffer == expires_at', async () => {
    const tokens = makeTokens({ expires_at: 1_000_000 });
    const refresh = vi.fn().mockResolvedValue({
      access_token: 'a2',
      refresh_token: 'r2',
      expires_in: 86400,
      token_type: 'bearer',
    });
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save: vi.fn(),
      clear: vi.fn(),
      refresh,
      now: () => 1_000_000 - 60_000, // ぴったり境界
    });
    await mgr.getValidAccessToken();
    expect(refresh).toHaveBeenCalled();
  });

  it('propagates RefreshTokenExpiredError', async () => {
    const tokens = makeTokens({ expires_at: 100 });
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn().mockRejectedValue(new RefreshTokenExpiredError()),
      now: () => 1_000_000,
    });
    await expect(mgr.getValidAccessToken()).rejects.toBeInstanceOf(RefreshTokenExpiredError);
  });

  it('preserves existing refresh_token if response omits it', async () => {
    const tokens = makeTokens({ expires_at: 100 });
    const save = vi.fn();
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(tokens),
      save,
      clear: vi.fn(),
      refresh: vi
        .fn()
        .mockResolvedValue({ access_token: 'a2', expires_in: 86400, token_type: 'bearer' }),
      now: () => 1_000_000,
    });
    await mgr.getValidAccessToken();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ refresh_token: 'r' }));
  });

  it('cancelCurrentFlow stops in-flight authorize listener', () => {
    const stop = vi.fn();
    const mgr = createAuthManager({
      load: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    mgr.registerCurrentFlow({ state: 'old-state', stop });
    mgr.cancelCurrentFlow();
    expect(stop).toHaveBeenCalled();
  });

  it('registerCurrentFlow preempts previous flow', () => {
    const oldStop = vi.fn();
    const newStop = vi.fn();
    const mgr = createAuthManager({
      load: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    mgr.registerCurrentFlow({ state: 'old', stop: oldStop });
    mgr.registerCurrentFlow({ state: 'new', stop: newStop });
    expect(oldStop).toHaveBeenCalled();
    expect(newStop).not.toHaveBeenCalled();
  });

  it('clear empties cache and inflight', async () => {
    const clear = vi.fn();
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      clear,
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    await mgr.clear();
    expect(clear).toHaveBeenCalled();
  });

  it('throws guidance error when no tokens are stored on getValidAccessToken', async () => {
    const mgr = createAuthManager({
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    await expect(mgr.getValidAccessToken()).rejects.toThrow(/No tokens/);
  });

  it('setTokens persists via deps.save and updates cache', async () => {
    const save = vi.fn();
    const load = vi.fn().mockResolvedValue(null);
    const mgr = createAuthManager({
      load,
      save,
      clear: vi.fn(),
      refresh: vi.fn(),
      now: () => Date.now(),
    });
    const tokens = makeTokens({ access_token: 'fresh' });
    await mgr.setTokens(tokens);
    expect(save).toHaveBeenCalledWith(tokens);
    // 後続の getCurrentTokens は cache から返るので load を再呼出ししない
    expect(await mgr.getCurrentTokens()).toEqual(tokens);
    expect(load).not.toHaveBeenCalled();
  });
});
