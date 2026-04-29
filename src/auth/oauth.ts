import { OURA_AUTHORIZATION_ENDPOINT, OURA_TOKEN_ENDPOINT, USER_AGENT } from '../constants.js';
import { log } from '../utils/log.js';

export class OuraOAuthError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'OuraOAuthError';
  }
}

export class RefreshTokenExpiredError extends Error {
  constructor() {
    super('Refresh token expired or revoked');
    this.name = 'RefreshTokenExpiredError';
  }
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'bearer';
  scope?: string;
};

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL(OURA_AUTHORIZATION_ENDPOINT);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('redirect_uri', params.redirectUri);
  u.searchParams.set('scope', params.scope);
  u.searchParams.set('state', params.state);
  u.searchParams.set('code_challenge', params.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  signal?: AbortSignal;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  });
  return tokenRequest(body, params.signal);
}

export async function refreshTokens(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  signal?: AbortSignal;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  return tokenRequest(body, params.signal);
}

async function tokenRequest(body: URLSearchParams, signal?: AbortSignal): Promise<TokenResponse> {
  const res = await fetch(OURA_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body,
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 400 && json.error === 'invalid_grant') {
      log.warn('auth.refresh_failed', { reason: 'invalid_grant' });
      throw new RefreshTokenExpiredError();
    }
    throw new OuraOAuthError(`Token endpoint ${res.status}`, res.status, json);
  }
  return json as unknown as TokenResponse;
}
