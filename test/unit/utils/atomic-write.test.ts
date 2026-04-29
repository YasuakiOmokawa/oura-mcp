import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { atomicWriteFile } from '../../../src/utils/atomic-write.js';

describe('atomicWriteFile', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'oura-aw-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writes content and creates parent directory', async () => {
    const target = path.join(tmp, 'a', 'b', 'file.json');
    await atomicWriteFile(target, '{"k":1}');
    expect(await readFile(target, 'utf-8')).toBe('{"k":1}');
  });

  it('applies mode option', async () => {
    const target = path.join(tmp, 'mode.txt');
    await atomicWriteFile(target, 'x', { mode: 0o600 });
    const m = statSync(target).mode & 0o777;
    expect(m).toBe(0o600);
  });

  it('overwrites existing file', async () => {
    const target = path.join(tmp, 'over.txt');
    await atomicWriteFile(target, 'first');
    await atomicWriteFile(target, 'second');
    expect(await readFile(target, 'utf-8')).toBe('second');
  });
});
