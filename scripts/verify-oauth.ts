#!/usr/bin/env -S npx tsx
// scripts/verify-oauth.ts
// Phase 0: Oura OAuth 仕様の実機検証スクリプト（v1 リリースには含めない）
//
// 検証項目:
//   1. ループバック redirect URI (http://127.0.0.1:54321/callback) が許可されるか
//   2. PKCE (code_challenge S256) が動作するか
//   3. token exchange で正しい code_verifier で access_token が返るか
//   4. 意図的に間違えた code_verifier で 400 invalid_grant が返るか（PKCE 検証あり）
//   5. refresh_token で access_token を更新できるか
//   6. refresh のレスポンスに新 refresh_token が含まれるか（rotation 有無）
//   7. 失効した refresh_token に対するエラー形式（invalid_grant 標準か）
//
// 使い方:
//   1. https://developer.ouraring.com/applications で開発者アプリを作成（旧 cloud.ouraring.com は 2025-10 で新規不可）
//      Redirect URI: http://localhost:54321/callback （完全一致、127.0.0.1 ではなく localhost）
//      Scopes: 全 read scope を有効化
//   2. Client ID と Client Secret を取得
//   3. 以下を実行:
//        OURA_CLIENT_ID=xxx OURA_CLIENT_SECRET=yyy npx tsx scripts/verify-oauth.ts
//   4. ブラウザで表示された URL を開いて認可
//   5. ターミナルに出力された結果を確認、design plan に追記

import crypto from "node:crypto";
import http from "node:http";

const CLIENT_ID = process.env.OURA_CLIENT_ID;
const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
// フェーズ0 検証で判明: Oura は redirect URI に `localhost` のみ HTTP 許可、`127.0.0.1` 拒否
// bind は `127.0.0.1` 維持して DNS rebinding 防御
const REDIRECT_URI = "http://localhost:54321/callback";
const PORT = 54321;
// 新ポータルのスコープは 11 個（旧 9 + stress + heart_health）
const SCOPE =
  "email personal daily heartrate workout tag session spo2 ring_configuration stress heart_health";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing OURA_CLIENT_ID or OURA_CLIENT_SECRET. See header comment for setup."
  );
  process.exit(1);
}

const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");
const state = crypto.randomUUID();

const authUrl = new URL("https://cloud.ouraring.com/oauth/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");

console.error(
  `\n[verify] Opening this URL in your browser:\n  ${authUrl.toString()}\n`
);

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
  return fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).then((res) =>
    res
      .json()
      .catch(() => ({}) as TokenResponse)
      .then((json) => ({ status: res.status, json: json as TokenResponse }))
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const recvState = url.searchParams.get("state");
  if (!code || recvState !== state) {
    res.writeHead(400).end("State mismatch or missing code");
    process.exit(1);
  }

  console.error("\n[verify] received authorization code, exchanging...");

  const exchangeBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  postToken(exchangeBody)
    .then(({ status, json }) => {
      console.error(
        `\n[verify] [exchange] status=${status} body=${JSON.stringify(json, null, 2)}`
      );
      if (status !== 200 || !json.access_token) {
        console.error("[verify] FAIL: exchange did not return access_token");
        return Promise.reject(new Error("exchange failed"));
      }

      // PKCE verification: 意図的に間違えた code_verifier で再試行
      console.error(
        "\n[verify] retrying exchange with WRONG code_verifier to check PKCE enforcement..."
      );
      const wrongBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        code_verifier: "wrong-verifier-" + crypto.randomUUID(),
      });
      return postToken(wrongBody).then(
        ({ status: s2, json: j2 }) => {
          console.error(
            `[verify] [exchange-wrong] status=${s2} body=${JSON.stringify(j2)}`
          );
          if (s2 === 200) {
            console.error(
              "[verify] WARN: PKCE NOT enforced (wrong verifier still succeeded? note: code is single-use, this MAY be expected)"
            );
          } else {
            console.error(
              "[verify] OK: wrong verifier rejected (could be code reuse OR PKCE — see error message above to determine)"
            );
          }
          return json;
        }
      );
    })
    .then((tokens) => {
      if (!tokens.refresh_token) {
        console.error(
          "[verify] WARN: no refresh_token returned — refresh test skipped"
        );
        return;
      }
      console.error("\n[verify] testing refresh_token flow...");
      const refreshBody = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
      });
      return postToken(refreshBody).then(({ status, json }) => {
        console.error(
          `[verify] [refresh] status=${status} body=${JSON.stringify(json, null, 2)}`
        );
        if (status !== 200) {
          console.error("[verify] FAIL: refresh did not return 200");
          return;
        }
        const rotated =
          json.refresh_token != null &&
          json.refresh_token !== tokens.refresh_token;
        console.error(
          `[verify] OK: refresh succeeded. rotation=${rotated} (new refresh_token=${json.refresh_token != null})`
        );

        // 失効テスト: 古い refresh_token を再使用して invalid_grant を確認
        console.error(
          "\n[verify] re-using OLD refresh_token to check invalid_grant behavior..."
        );
        return postToken(refreshBody).then(({ status: s3, json: j3 }) => {
          console.error(
            `[verify] [refresh-old] status=${s3} body=${JSON.stringify(j3)}`
          );
          if (s3 === 400 && j3.error === "invalid_grant") {
            console.error(
              "[verify] OK: invalid_grant on reused refresh_token (rotation enforced)"
            );
          } else if (s3 === 200) {
            console.error(
              "[verify] note: old refresh_token still works (rotation NOT enforced)"
            );
          } else {
            console.error(
              `[verify] note: unexpected status ${s3} on old refresh_token`
            );
          }
        });
      });
    })
    .catch((err: Error) => {
      console.error(`[verify] error: ${err.message}`);
    })
    .finally(() => {
      res.writeHead(200, { "Content-Type": "text/html" }).end(
        "<h1>Verification done</h1><p>Check terminal output and close this tab.</p>"
      );
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`[verify] callback listener bound to 127.0.0.1:${PORT}`);
  console.error(
    "[verify] open the URL above in your browser and authorize. Times out in 5 minutes."
  );
});

setTimeout(
  () => {
    console.error("[verify] timeout (5 min)");
    server.close();
    process.exit(1);
  },
  5 * 60 * 1000
);
