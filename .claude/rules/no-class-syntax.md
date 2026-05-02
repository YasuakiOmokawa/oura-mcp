---
paths: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"]
---

# クラス構文の禁止（カスタムエラーのみ例外）

TypeScript で書くがクラス構文は **原則使わない**。理由:

- `this` バインド事故をなくすため（コールバック・MCP ハンドラ等で頻繁に発生）
- 状態は closure に閉じ込め、外部から触れない設計を強制するため
- factory 関数 + 純粋関数の方がツリーシェイクとテストしやすいため

## 採用パターン

| 用途 | パターン |
|---|---|
| 状態を持つマネージャ（auth manager、callback server 等） | factory 関数 + closure |
| インターフェース実装の差し替え（TokenStore 等） | `type` で interface 定義 + `create*` factory |
| ステートレス処理 | named export の純粋関数 |
| カスタムエラー | **`class X extends Error` のみ許容**（後述） |

## 例

```ts
// ✅ factory + closure
export function createAuthManager(deps: { tokenStore: TokenStore; oauth: OauthClient }) {
  let inflightRefresh: Promise<Tokens> | null = null;
  return {
    getValidToken: () => { /* ... */ },
    clear: () => deps.tokenStore.clear(),
  };
}

// ✅ type + factory
export type TokenStore = {
  load: () => Promise<Tokens | null>;
  save: (t: Tokens) => Promise<void>;
  clear: () => Promise<void>;
};
export function createFileTokenStore(filePath: string): TokenStore {
  return {
    load: () => fs.promises.readFile(filePath, 'utf-8').then(JSON.parse),
    save: (t) => fs.promises.writeFile(filePath, JSON.stringify(t), { mode: 0o600 }),
    clear: () => fs.promises.unlink(filePath),
  };
}

// ❌ 使わない
export class AuthManager {
  private inflightRefresh: Promise<Tokens> | null = null;
  // ...
}
```

## 例外: カスタムエラーは class を使う

`Error` の stack trace を JS エンジンが正しく生成するのは class 経由のため。`instanceof` 判定の clean さもメリット。

```ts
export class OuraApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`Oura API ${status}: ${body}`);
    this.name = 'OuraApiError';
  }
}
```
