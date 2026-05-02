#!/usr/bin/env -S npx tsx
// scripts/verify-oauth.ts
// Phase 0: live verification of Oura's OAuth spec (not shipped in the v1 package).
// Walks the shortest path: authorize → exchange → refresh immediately afterwards.
// Note: code reuse and wrong-code_verifier tests are NOT performed here, since
// Oura may invalidate the refresh_token as a security measure.
//
// Usage:
//   1. Create a developer app at https://developer.ouraring.com/applications
//      Redirect URI: http://localhost:54321/callback (exact match, `localhost` only)
//      Scopes: enable all 11 read scopes
//   2. Get the Client ID / Client Secret
//   3. Run:
//        export OURA_CLIENT_ID=...
//        export OURA_CLIENT_SECRET=...
//        npx tsx scripts/verify-oauth.ts

import crypto from 'node:crypto';
import http from 'node:http';

const CLIENT_ID = process.env.OURA_CLIENT_ID;
const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:54321/callback';
const PORT = 54321;
const SCOPE =
  'email personal daily heartrate tag workout session spo2 ring_configuration stress heart_health';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing OURA_CLIENT_ID or OURA_CLIENT_SECRET.');
  process.exit(1);
}
const clientId: string = CLIENT_ID;
const clientSecret: string = CLIENT_SECRET;

const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const state = crypto.randomUUID();

const authUrl = new URL('https://cloud.ouraring.com/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.error(`\n[clean] Open this URL:\n  ${authUrl.toString()}\n`);

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function postToken(body: URLSearchParams): Promise<{
  status: number;
  json: TokenResponse;
}> {
  return fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  }).then((res) =>
    res
      .json()
      .catch(() => ({}) as TokenResponse)
      .then((json) => ({ status: res.status, json: json as TokenResponse })),
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  const recvState = url.searchParams.get('state');
  if (!code || recvState !== state) {
    res.writeHead(400).end('State mismatch or missing code');
    process.exit(1);
  }

  console.error('\n[clean] received code, exchanging immediately...');

  const exchangeBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  postToken(exchangeBody)
    .then(({ status, json }) => {
      console.error(
        `\n[clean] [exchange] status=${status} access_token=${json.access_token ? '***' : '(none)'} refresh_token=${json.refresh_token ? '***' : '(none)'}`,
      );
      console.error(
        `[clean] [exchange] expires_in=${json.expires_in} token_type=${json.token_type} scope=${json.scope}`,
      );
      if (status !== 200 || !json.access_token || !json.refresh_token) {
        return Promise.reject(new Error('[clean] FAIL: exchange did not return tokens'));
      }

      // Run refresh **immediately** afterwards (no wrong-verifier test in between)
      console.error('\n[clean] refreshing IMMEDIATELY (no other operations between)...');
      const refreshBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: json.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      });
      return postToken(refreshBody).then(({ status: s2, json: j2 }) => {
        console.error(
          `[clean] [refresh] status=${s2} body=${JSON.stringify({
            ...j2,
            access_token: j2.access_token ? '***' : undefined,
            refresh_token: j2.refresh_token ? '***' : undefined,
          })}`,
        );
        if (s2 === 200) {
          const rotated = j2.refresh_token != null && j2.refresh_token !== json.refresh_token;
          console.error(
            `[clean] OK: refresh worked. rotation=${rotated}, new_expires_in=${j2.expires_in}`,
          );
        } else {
          console.error(
            `[clean] FAIL: refresh returned ${s2} - error=${j2.error} desc=${j2.error_description}`,
          );
        }
      });
    })
    .catch((err: Error) => {
      console.error(`[clean] error: ${err.message}`);
    })
    .finally(() => {
      res
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end('<h1>Done</h1><p>Check terminal.</p>');
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
});

server.listen(PORT, '127.0.0.1', () => {
  console.error(`[clean] callback listener bound to 127.0.0.1:${PORT}`);
});

setTimeout(
  () => {
    console.error('[clean] timeout (5 min)');
    server.close();
    process.exit(1);
  },
  5 * 60 * 1000,
);
