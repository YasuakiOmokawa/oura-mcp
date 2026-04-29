import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DEFAULT_CALLBACK_PORT, OURA_API_BASE } from './constants.js';
import { getConfigDir } from './utils/config-dir.js';
import { log } from './utils/log.js';

export const ConfigDataSchema = z.object({
  schemaVersion: z.literal(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  callbackPort: z.number().int().min(1024).max(65535).optional(),
  apiUrl: z.string().url().optional(),
});
export type ConfigData = z.infer<typeof ConfigDataSchema>;

export type RuntimeConfig = {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
  apiUrl: string;
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
    log.warn('config.deprecated_env', {
      hint: 'consider running `npx @yasuakiomokawa/oura-mcp configure`',
    });
    return {
      clientId: envId,
      clientSecret: envSecret,
      callbackPort: parsePort(process.env.OURA_CALLBACK_PORT) ?? DEFAULT_CALLBACK_PORT,
      apiUrl: OURA_API_BASE,
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
    apiUrl: fileCfg.apiUrl ?? OURA_API_BASE,
  };
}

async function loadConfigFile(): Promise<ConfigData | null> {
  return readFile(getConfigPath(), 'utf-8')
    .then((raw) => Promise.resolve().then(() => JSON.parse(raw) as unknown))
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
