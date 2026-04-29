import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfigDir } from '../../../src/utils/config-dir.js';

describe('getConfigDir', () => {
  const orig = process.env.XDG_CONFIG_HOME;
  beforeEach(() => {
    delete process.env.XDG_CONFIG_HOME;
  });
  afterEach(() => {
    if (orig !== undefined) process.env.XDG_CONFIG_HOME = orig;
  });

  it('returns ~/.config/oura-mcp by default', () => {
    expect(getConfigDir()).toBe(path.join(os.homedir(), '.config', 'oura-mcp'));
  });

  it('honors XDG_CONFIG_HOME', () => {
    process.env.XDG_CONFIG_HOME = '/tmp/xdg';
    expect(getConfigDir()).toBe(path.join('/tmp/xdg', 'oura-mcp'));
  });
});
