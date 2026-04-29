import { OURA_CALLBACK_PATH, OURA_OAUTH_SCOPE, OURA_REDIRECT_HOST } from '../constants.js';
import { startCallbackServer } from '../server/http-server.js';
import { buildAuthorizeUrl, exchangeCode, type TokenResponse } from './oauth.js';
import { generatePKCE, generateState } from './token-utils.js';
import type { TokenData } from './tokens.js';

export type AuthorizeFlowDeps = {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
  saveTokens: (t: TokenData) => Promise<void>;
  onAuthorizeUrl: (url: string) => Promise<void>;
  registerFlow?: (handle: { state: string; stop: () => void }) => void;
  now: () => number;
};

export type AuthorizeFlowResult = {
  authorizeUrl: string;
  completion: Promise<TokenData>;
};

export function buildRedirectUri(port: number): string {
  return `http://${OURA_REDIRECT_HOST}:${port}${OURA_CALLBACK_PATH}`;
}

export function toTokenData(res: TokenResponse, prev: TokenData | null, now: number): TokenData {
  return {
    schemaVersion: 1,
    access_token: res.access_token,
    refresh_token: res.refresh_token ?? prev?.refresh_token ?? '',
    expires_at: now + res.expires_in * 1000,
    token_type: 'bearer',
    scope: res.scope ?? prev?.scope ?? OURA_OAUTH_SCOPE,
    obtained_at: now,
  };
}

export async function runAuthorizationFlow(deps: AuthorizeFlowDeps): Promise<AuthorizeFlowResult> {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();
  const redirectUri = buildRedirectUri(deps.callbackPort);

  const url = buildAuthorizeUrl({
    clientId: deps.clientId,
    redirectUri,
    scope: OURA_OAUTH_SCOPE,
    state,
    codeChallenge,
  });

  const cb = await startCallbackServer({ expectedState: state, port: deps.callbackPort });
  deps.registerFlow?.({ state, stop: cb.stop });

  await deps.onAuthorizeUrl(url);

  const completion = cb.codePromise
    .then((code) =>
      exchangeCode({
        code,
        codeVerifier,
        redirectUri,
        clientId: deps.clientId,
        clientSecret: deps.clientSecret,
        signal: AbortSignal.timeout(10_000),
      }),
    )
    .then((res) => {
      if (!res.refresh_token) {
        throw new Error('Oura returned no refresh_token');
      }
      const tokens = toTokenData(res, null, deps.now());
      return deps.saveTokens(tokens).then(() => tokens);
    });

  return { authorizeUrl: url, completion };
}
