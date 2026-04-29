import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('loadConfig', () => {
  let tmp: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'oura-config-'));
    process.env.XDG_CONFIG_HOME = tmp;
    delete process.env.OURA_CLIENT_ID;
    delete process.env.OURA_CLIENT_SECRET;
    delete process.env.OURA_CALLBACK_PORT;
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...origEnv };
    rmSync(tmp, { recursive: true, force: true });
  });

  it('throws when no env nor config file', async () => {
    const { loadConfig } = await import('../../src/config.js');
    await expect(loadConfig()).rejects.toThrow(/configure/i);
  });

  it('uses env vars when both id and secret set', async () => {
    process.env.OURA_CLIENT_ID = 'id1';
    process.env.OURA_CLIENT_SECRET = 'sec1';
    const { loadConfig } = await import('../../src/config.js');
    const cfg = await loadConfig();
    expect(cfg.clientId).toBe('id1');
    expect(cfg.clientSecret).toBe('sec1');
  });

  it('throws when only OURA_CLIENT_ID env is set', async () => {
    process.env.OURA_CLIENT_ID = 'id1';
    const { loadConfig } = await import('../../src/config.js');
    await expect(loadConfig()).rejects.toThrow(/OURA_CLIENT_SECRET/);
  });

  it('throws when only OURA_CLIENT_SECRET env is set', async () => {
    process.env.OURA_CLIENT_SECRET = 'sec1';
    const { loadConfig } = await import('../../src/config.js');
    await expect(loadConfig()).rejects.toThrow(/OURA_CLIENT_ID/);
  });

  it('falls back to config.json when env not set', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({
        schemaVersion: 1,
        clientId: 'fid',
        clientSecret: 'fsec',
      }),
    );
    const { loadConfig } = await import('../../src/config.js');
    const cfg = await loadConfig();
    expect(cfg.clientId).toBe('fid');
    expect(cfg.clientSecret).toBe('fsec');
  });

  it('uses config.json callbackPort when set', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({
        schemaVersion: 1,
        clientId: 'fid',
        clientSecret: 'fsec',
        callbackPort: 12345,
      }),
    );
    const { loadConfig } = await import('../../src/config.js');
    const cfg = await loadConfig();
    expect(cfg.callbackPort).toBe(12345);
  });

  it('returns null + warns on invalid config.json (still throws since no creds)', async () => {
    const dir = path.join(tmp, 'oura-mcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'config.json'), '{ broken json');
    const { loadConfig } = await import('../../src/config.js');
    await expect(loadConfig()).rejects.toThrow(/configure/i);
  });

  it('rejects invalid OURA_CALLBACK_PORT and falls back', async () => {
    process.env.OURA_CLIENT_ID = 'id1';
    process.env.OURA_CLIENT_SECRET = 'sec1';
    process.env.OURA_CALLBACK_PORT = 'not-a-number';
    const { loadConfig } = await import('../../src/config.js');
    const cfg = await loadConfig();
    expect(cfg.callbackPort).toBe(54321);
  });

  it('rejects out-of-range OURA_CALLBACK_PORT (<1024)', async () => {
    process.env.OURA_CLIENT_ID = 'id1';
    process.env.OURA_CLIENT_SECRET = 'sec1';
    process.env.OURA_CALLBACK_PORT = '80';
    const { loadConfig } = await import('../../src/config.js');
    const cfg = await loadConfig();
    expect(cfg.callbackPort).toBe(54321);
  });
});
