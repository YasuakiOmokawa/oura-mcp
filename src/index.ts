#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOuraClient } from './api/client.js';
import { createAuthManager } from './auth/auth-manager.js';
import { runAuthorizationFlow } from './auth/authorize-flow.js';
import { refreshTokens } from './auth/oauth.js';
import { clearTokens, loadTokens, saveTokens } from './auth/tokens.js';
import { loadConfig } from './config.js';
import { createOuraMcpServer } from './mcp/server.js';
import { createSchemaLoader } from './openapi/schema-loader.js';
import { log } from './utils/log.js';

async function startStdio(): Promise<void> {
  const config = await loadConfig();
  const authManager = createAuthManager({
    load: loadTokens,
    save: saveTokens,
    clear: clearTokens,
    refresh: (rt, signal) =>
      refreshTokens({
        refreshToken: rt,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        signal,
      }),
    now: () => Date.now(),
  });
  const client = createOuraClient({
    getAccessToken: () => authManager.getValidAccessToken(),
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, '..', 'openapi', 'minimal', 'oura-v2.json');
  const schemaLoader = createSchemaLoader(schemaPath);

  const server = createOuraMcpServer({
    authManager,
    client,
    schemaLoader,
    startReauth: () => startReauthFlow(config, authManager),
  });

  const transport = new StdioServerTransport();
  const shutdown = (): void => {
    log.info('shutdown');
    transport
      .close()
      .catch(() => {})
      .finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.connect(transport);
  log.info('server.started');
}

async function startReauthFlow(
  config: Awaited<ReturnType<typeof loadConfig>>,
  authManager: ReturnType<typeof createAuthManager>,
): Promise<string> {
  const { authorizeUrl, completion } = await runAuthorizationFlow({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    callbackPort: config.callbackPort,
    saveTokens: (t) => authManager.setTokens(t),
    onAuthorizeUrl: () => Promise.resolve(),
    registerFlow: (h) => authManager.registerCurrentFlow(h),
    now: () => Date.now(),
  });
  completion
    .then(() => {
      log.info('auth.authorize.ok');
      authManager.cancelCurrentFlow();
    })
    .catch((err: Error) => {
      log.error('auth.authorize.failed', { error: err.message });
      authManager.cancelCurrentFlow();
    });
  return authorizeUrl;
}

async function main(): Promise<void> {
  if (process.argv[2] === 'configure') {
    const { configure } = await import('./cli/index.js');
    const force = process.argv.slice(3).includes('--force');
    await configure({ force });
    return;
  }
  await startStdio();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
