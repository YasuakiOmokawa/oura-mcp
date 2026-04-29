import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { CONFIG_FILE_PERMISSION } from '../constants.js';
import { atomicWriteFile } from '../utils/atomic-write.js';
import { getConfigDir } from '../utils/config-dir.js';
import { log } from '../utils/log.js';

export const TokenDataSchema = z.object({
  schemaVersion: z.literal(1),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
  token_type: z.literal('bearer'),
  scope: z.string(),
  obtained_at: z.number().int().positive(),
});
export type TokenData = z.infer<typeof TokenDataSchema>;

const CURRENT_TOKEN_VERSION = 1 as const;

function getTokenPath(): string {
  return path.join(getConfigDir(), 'tokens.json');
}

export async function loadTokens(): Promise<TokenData | null> {
  return readFile(getTokenPath(), 'utf-8')
    .then((raw) => JSON.parse(raw) as unknown)
    .then((parsed) => {
      const result = TokenDataSchema.safeParse(migrateTokens(parsed));
      if (!result.success) {
        log.warn('tokens.invalid', { error: result.error.message });
        return null;
      }
      return result.data;
    })
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return null;
      if (err instanceof SyntaxError) {
        log.warn('tokens.invalid_json');
        return null;
      }
      log.warn('tokens.read_error', { error: err.message });
      return null;
    });
}

export function saveTokens(tokens: TokenData): Promise<void> {
  return atomicWriteFile(getTokenPath(), JSON.stringify(tokens, null, 2), {
    mode: CONFIG_FILE_PERMISSION,
  });
}

export function clearTokens(): Promise<void> {
  return unlink(getTokenPath()).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== 'ENOENT') throw err;
  });
}

function migrateTokens(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  if (!('schemaVersion' in obj)) {
    log.info('tokens.migrate', { from: 'v0', to: `v${CURRENT_TOKEN_VERSION}` });
    return {
      schemaVersion: CURRENT_TOKEN_VERSION,
      access_token: obj.access_token,
      refresh_token: obj.refresh_token,
      expires_at: obj.expires_at,
      token_type: 'bearer',
      scope: obj.scope ?? '',
      obtained_at: obj.obtained_at ?? Date.now(),
    };
  }
  return obj;
}
