import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('tokens', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'oura-tokens-'));
    process.env.XDG_CONFIG_HOME = tmp;
    vi.resetModules();
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns null when file missing', async () => {
    const { loadTokens } = await import('../../../src/auth/tokens.js');
    expect(await loadTokens()).toBeNull();
  });

  it('saves tokens with 0600 permission', async () => {
    const { saveTokens, loadTokens } = await import('../../../src/auth/tokens.js');
    await saveTokens({
      schemaVersion: 1,
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 100,
      token_type: 'bearer',
      scope: 'personal',
      obtained_at: 50,
    });
    const file = path.join(tmp, 'oura-mcp', 'tokens.json');
    const mode = statSync(file).mode & 0o777;
    expect(mode).toBe(0o600);
    const t = await loadTokens();
    expect(t?.access_token).toBe('a');
  });

  it('migrates v0 (no schemaVersion) to v1', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'tokens.json'),
      JSON.stringify({
        access_token: 'a',
        refresh_token: 'r',
        expires_at: 100,
      }),
    );
    const { loadTokens } = await import('../../../src/auth/tokens.js');
    const t = await loadTokens();
    expect(t?.schemaVersion).toBe(1);
    expect(t?.access_token).toBe('a');
    expect(t?.token_type).toBe('bearer');
  });

  it('returns null on invalid JSON', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'tokens.json'), '{ broken');
    const { loadTokens } = await import('../../../src/auth/tokens.js');
    expect(await loadTokens()).toBeNull();
  });

  it('returns null on schema-invalid (missing required field)', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'tokens.json'),
      JSON.stringify({
        schemaVersion: 1,
        access_token: '',
        refresh_token: 'r',
        expires_at: 100,
        token_type: 'bearer',
        scope: '',
        obtained_at: 50,
      }),
    );
    const { loadTokens } = await import('../../../src/auth/tokens.js');
    expect(await loadTokens()).toBeNull();
  });

  it('clearTokens removes file', async () => {
    const { saveTokens, clearTokens, loadTokens } = await import('../../../src/auth/tokens.js');
    await saveTokens({
      schemaVersion: 1,
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 100,
      token_type: 'bearer',
      scope: '',
      obtained_at: 50,
    });
    await clearTokens();
    expect(await loadTokens()).toBeNull();
  });

  it('clearTokens is idempotent (no error if file missing)', async () => {
    const { clearTokens } = await import('../../../src/auth/tokens.js');
    await expect(clearTokens()).resolves.toBeUndefined();
  });

  it('returns null on non-ENOENT read error (token path is a directory)', async () => {
    // Create tokens.json as a directory so readFile fails with EISDIR, exercising that error path
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    mkdirSync(path.join(dir, 'tokens.json'));
    const { loadTokens } = await import('../../../src/auth/tokens.js');
    expect(await loadTokens()).toBeNull();
  });
});
