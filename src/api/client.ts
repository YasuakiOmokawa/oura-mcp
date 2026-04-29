import { HTTP_TIMEOUT_MS, OURA_API_BASE, USER_AGENT } from '../constants.js';
import { log } from '../utils/log.js';
import { OuraApiError } from './errors.js';

export type OuraClient = {
  get: (
    path: string,
    params?: Record<string, string | number>,
  ) => Promise<{ status: number; data: unknown }>;
};

export type OuraClientDeps = {
  getAccessToken: () => Promise<string>;
};

const API_HOST = OURA_API_BASE.replace(/\/v2$/, '');

export function createOuraClient(deps: OuraClientDeps): OuraClient {
  return {
    get: async (path, params) => {
      if (!path.startsWith('/v2/')) {
        throw new Error(`Invalid path (must start with /v2/): ${path}`);
      }
      const url = new URL(`${API_HOST}${path}`);
      if (params) {
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
      }
      const token = await deps.getAccessToken();
      log.debug('api.request', { path, params });
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      const text = await res.text();
      const data = await Promise.resolve()
        .then(() => JSON.parse(text) as unknown)
        .catch(() => text as unknown);
      log.debug('api.response', { path, status: res.status });
      if (!res.ok) throw new OuraApiError(res.status, data);
      return { status: res.status, data };
    },
  };
}
