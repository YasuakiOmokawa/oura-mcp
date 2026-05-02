import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureSecureFile } from '../../../src/utils/secure-file.js';

describe('ensureSecureFile', () => {
  let tmp: string;
  let file: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'secure-file-'));
    file = path.join(tmp, 'token.json');
    writeFileSync(file, '{}', { mode: 0o600 });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns ok when mode is already 0600', async () => {
    chmodSync(file, 0o600);
    await ensureSecureFile(file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('chmods to 0600 when group/other have any access', async () => {
    chmodSync(file, 0o644);
    await ensureSecureFile(file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('chmods to 0600 even when world-writable', async () => {
    chmodSync(file, 0o666);
    await ensureSecureFile(file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('is a no-op for missing file', async () => {
    await expect(ensureSecureFile(path.join(tmp, 'missing.json'))).resolves.toBeUndefined();
  });

  it('chmods parent directory to 0700 when too permissive', async () => {
    const dir = path.join(tmp, 'subdir');
    mkdirSync(dir, { mode: 0o755 });
    const f = path.join(dir, 'tokens.json');
    writeFileSync(f, '{}', { mode: 0o600 });
    chmodSync(dir, 0o755);
    await ensureSecureFile(f);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });
});
