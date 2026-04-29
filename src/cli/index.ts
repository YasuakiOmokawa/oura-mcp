import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PACKAGE_VERSION } from '../constants.js';
import { getConfigDir } from '../utils/config-dir.js';
import { saveConfig } from './configuration.js';
import { configureClients } from './integrations/index.js';
import { performOAuth } from './oauth-flow.js';
import { type Credentials, collectCredentials } from './prompts.js';

export async function configure(): Promise<void> {
  console.error(`\n=== oura-mcp v${PACKAGE_VERSION} Setup ===\n`);

  const onSigint = (): void => {
    console.error('\n[Cancelled]');
    process.exit(130);
  };
  process.once('SIGINT', onSigint);

  return runWizard().finally(() => {
    process.removeListener('SIGINT', onSigint);
  });
}

async function runWizard(): Promise<void> {
  console.error('Step 1/4: Credentials');
  const creds = await collectCredentials();

  const prev = await readPrevConfig();
  const isUnchanged =
    prev !== null &&
    prev.clientId === creds.clientId &&
    prev.clientSecret === creds.clientSecret &&
    prev.callbackPort === creds.callbackPort;

  console.error('\nStep 2/4: OAuth');
  await performOAuth(creds);

  console.error('\nStep 3/4: Save');
  if (isUnchanged) {
    console.error('  (Config unchanged; saving tokens only.)');
  } else {
    await saveConfig(creds);
    console.error('  Config saved to ~/.config/oura-mcp/config.json');
  }
  console.error('  Tokens saved to ~/.config/oura-mcp/tokens.json');

  console.error('\nStep 4/4: MCP client integration');
  await configureClients();

  console.error('\nDone. Restart your MCP client to load oura-mcp.');
}

async function readPrevConfig(): Promise<Credentials | null> {
  return readFile(path.join(getConfigDir(), 'config.json'), 'utf-8')
    .then(
      (raw) =>
        JSON.parse(raw) as {
          clientId?: string;
          clientSecret?: string;
          callbackPort?: number;
        },
    )
    .then((parsed) => {
      if (
        typeof parsed.clientId !== 'string' ||
        typeof parsed.clientSecret !== 'string' ||
        typeof parsed.callbackPort !== 'number'
      ) {
        return null;
      }
      return {
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        callbackPort: parsed.callbackPort,
      };
    })
    .catch(() => null);
}
