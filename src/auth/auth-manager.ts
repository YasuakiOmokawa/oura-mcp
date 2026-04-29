import { TOKEN_REFRESH_BUFFER_MS } from '../constants.js';
import { log } from '../utils/log.js';
import { toTokenData } from './authorize-flow.js';
import type { TokenResponse } from './oauth.js';
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
    // 並行 call が同じ Promise を共有するために同期代入が必須 (await する前に inflight を立てる)
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
    const res = await deps.refresh(current.refresh_token, AbortSignal.timeout(10_000));
    const next = toTokenData(res, current, deps.now());
    await deps.save(next);
    cached = next;
    log.info('auth.refresh.ok', { expires_at: next.expires_at });
    return next;
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
