import { TOKEN_REFRESH_BUFFER_MS } from '../constants.js';
import { log } from '../utils/log.js';
import { toTokenData } from './authorize-flow.js';
import { RefreshTokenExpiredError, type TokenResponse } from './oauth.js';
import type { TokenData } from './tokens.js';

export type AuthManagerDeps = {
  load: () => Promise<TokenData | null>;
  save: (t: TokenData) => Promise<void>;
  clear: () => Promise<void>;
  refresh: (refreshToken: string, signal: AbortSignal) => Promise<TokenResponse>;
  now: () => number;
};

export type FlowHandle = { state: string; stop: () => void };

export type AuthManager = {
  getValidAccessToken: () => Promise<string>;
  getCurrentTokens: () => Promise<TokenData | null>;
  setTokens: (t: TokenData) => Promise<void>;
  clear: () => Promise<void>;
  registerCurrentFlow: (flow: FlowHandle) => void;
  cancelCurrentFlow: () => void;
};

export function createAuthManager(deps: AuthManagerDeps): AuthManager {
  let inflight: Promise<TokenData> | null = null;
  let currentFlow: FlowHandle | null = null;
  let cached: TokenData | null = null;

  const loadCached = async (): Promise<TokenData | null> => {
    if (cached) return cached;
    cached = await deps.load();
    return cached;
  };

  function refreshIfNeeded(): Promise<TokenData> {
    if (inflight) return inflight;
    // Synchronous assignment is required so concurrent callers share the same Promise (set inflight before any await)
    inflight = doRefresh().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function doRefresh(): Promise<TokenData> {
    const current = await loadCached();
    if (!current) {
      throw new Error(
        'No tokens. Run `oura_authenticate` or `npx @yasuakiomokawa/oura-mcp configure`.',
      );
    }
    if (deps.now() + TOKEN_REFRESH_BUFFER_MS < current.expires_at) return current;

    log.info('auth.refresh');
    return deps
      .refresh(current.refresh_token, AbortSignal.timeout(10_000))
      .then(async (res) => {
        const next = toTokenData(res, current, deps.now());
        await deps.save(next);
        cached = next;
        log.info('auth.refresh.ok', { expires_at: next.expires_at });
        return next;
      })
      .catch(async (err: unknown) => {
        // OAuth 2.1 BCP refresh-token reuse detection: a 400 invalid_grant means
        // the refresh_token was revoked or replayed. Wipe local tokens so the
        // next tool call forces a clean re-authorization.
        if (err instanceof RefreshTokenExpiredError) {
          log.warn('auth.refresh.reuse_detected');
          cached = null;
          await deps.clear();
        }
        throw err;
      });
  }

  return {
    getValidAccessToken: async () => (await refreshIfNeeded()).access_token,
    getCurrentTokens: () => loadCached(),
    setTokens: async (t) => {
      await deps.save(t);
      cached = t;
    },
    clear: async () => {
      await deps.clear();
      cached = null;
      inflight = null;
    },
    registerCurrentFlow: (flow) => {
      if (currentFlow) {
        log.warn('auth.preempted', { previousState: currentFlow.state });
        currentFlow.stop();
      }
      currentFlow = flow;
    },
    cancelCurrentFlow: () => {
      if (currentFlow) {
        currentFlow.stop();
        currentFlow = null;
      }
    },
  };
}
