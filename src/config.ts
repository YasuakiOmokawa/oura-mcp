import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DEFAULT_CALLBACK_PORT } from './constants.js';
import { getConfigDir } from './utils/config-dir.js';
import { log } from './utils/log.js';
import { ensureSecureFile } from './utils/secure-file.js';

export const ConfigDataSchema = z.object({
  schemaVersion: z.literal(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  callbackPort: z.number().int().min(1024).max(65535).optional(),
});
export type ConfigData = z.infer<typeof ConfigDataSchema>;

export type RuntimeConfig = {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
};

function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const envId = process.env.OURA_CLIENT_ID;
  const envSecret = process.env.OURA_CLIENT_SECRET;

  if (envId && !envSecret) {
    throw new Error(
      'OURA_CLIENT_ID set but OURA_CLIENT_SECRET missing. Run `npx @yasuakiomokawa/oura-mcp configure`.',
    );
  }
  if (!envId && envSecret) {
    throw new Error(
      'OURA_CLIENT_SECRET set but OURA_CLIENT_ID missing. Run `npx @yasuakiomokawa/oura-mcp configure`.',
    );
  }
  if (envId && envSecret) {
    // Env-based credentials are visible via /proc/<pid>/environ and inherited
    // by child processes. Recommend `configure` for at-rest 0600 storage and
    // keep env support around only for CI / Docker / ephemeral runs.
    log.warn('config.env_credentials', {
      hint: 'env vars leak via /proc and child processes; prefer `npx @yasuakiomokawa/oura-mcp configure` for at-rest 0600 storage',
    });
    return {
      clientId: envId,
      clientSecret: envSecret,
      callbackPort: parsePort(process.env.OURA_CALLBACK_PORT) ?? DEFAULT_CALLBACK_PORT,
    };
  }

  const fileCfg = await loadConfigFile();
  if (!fileCfg) {
    throw new Error(
      'No credentials configured. Run `npx @yasuakiomokawa/oura-mcp configure` to set up.',
    );
  }
  return {
    clientId: fileCfg.clientId,
    clientSecret: fileCfg.clientSecret,
    callbackPort: fileCfg.callbackPort ?? DEFAULT_CALLBACK_PORT,
  };
}

async function loadConfigFile(): Promise<ConfigData | null> {
  const file = getConfigPath();
  await ensureSecureFile(file);
  return readFile(file, 'utf-8')
    .then((raw) => JSON.parse(raw) as unknown)
    .then((parsed) => {
      const result = ConfigDataSchema.safeParse(parsed);
      if (!result.success) {
        log.warn('config.invalid', { error: result.error.message });
        return null;
      }
      return result.data;
    })
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return null;
      if (err instanceof SyntaxError) {
        log.warn('config.invalid_json');
        return null;
      }
      log.warn('config.read_error', { error: err.message });
      return null;
    });
}

function parsePort(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) {
    log.warn('config.invalid_port', { value: raw, fallback: DEFAULT_CALLBACK_PORT });
    return undefined;
  }
  return n;
}
