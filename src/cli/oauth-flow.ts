import open from 'open';
import { createAuthManager } from '../auth/auth-manager.js';
import { runAuthorizationFlow } from '../auth/authorize-flow.js';
import { clearTokens, loadTokens, saveTokens } from '../auth/tokens.js';
import type { Credentials } from './prompts.js';

export async function performOAuth(creds: Credentials): Promise<void> {
  // CLI フェーズ専用 AuthManager。refresh は configure 中に走らないため no-op を投げる
  const authManager = createAuthManager({
    load: loadTokens,
    save: saveTokens,
    clear: clearTokens,
    refresh: () => Promise.reject(new Error('refresh not used in CLI flow')),
    now: () => Date.now(),
  });

  const { completion } = await runAuthorizationFlow({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    callbackPort: creds.callbackPort,
    saveTokens: (t) => authManager.setTokens(t),
    onAuthorizeUrl: (url) => {
      console.error(`\nOpening browser to authorize...\n${url}\n`);
      return open(url)
        .then(() => {})
        .catch(() => {
          console.error('(open failed; please visit the URL manually)');
        });
    },
    now: () => Date.now(),
  });

  console.error('Waiting for authorization (5 min timeout)...');
  await completion;
}
