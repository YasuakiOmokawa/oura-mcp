import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSchemaLoader } from '../../../src/openapi/schema-loader.js';

describe('schema-loader', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'sch-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeFixture(paths: Record<string, unknown>): string {
    const file = path.join(tmp, 'minimal.json');
    writeFileSync(file, JSON.stringify({ paths }));
    return file;
  }

  it('lists GET paths only, sorted', () => {
    const file = writeFixture({
      '/v2/usercollection/daily_sleep': { get: { summary: 'Daily sleep' } },
      '/v2/usercollection/heartrate': { get: { summary: 'Heart rate' } },
      '/v2/usercollection/no_get': { post: {} },
    });
    const loader = createSchemaLoader(file);
    const list = loader.listAllAvailablePaths();
    expect(list).toContain('/v2/usercollection/daily_sleep');
    expect(list).toContain('/v2/usercollection/heartrate');
    expect(list).not.toContain('/v2/usercollection/no_get');
    // sorted
    expect(list.indexOf('daily_sleep')).toBeLessThan(list.indexOf('heartrate'));
  });

  it('includes summary in listing', () => {
    const file = writeFixture({
      '/v2/usercollection/daily_sleep': { get: { summary: 'Daily sleep score' } },
    });
    const loader = createSchemaLoader(file);
    expect(loader.listAllAvailablePaths()).toContain('Daily sleep score');
  });

  it('validatePath returns true for registered GET paths', () => {
    const file = writeFixture({ '/v2/usercollection/daily_sleep': { get: {} } });
    const loader = createSchemaLoader(file);
    expect(loader.validatePath('/v2/usercollection/daily_sleep')).toBe(true);
    expect(loader.validatePath('/v2/usercollection/missing')).toBe(false);
  });

  it('validatePath returns false for non-GET paths', () => {
    const file = writeFixture({ '/v2/usercollection/post_only': { post: {} } });
    const loader = createSchemaLoader(file);
    expect(loader.validatePath('/v2/usercollection/post_only')).toBe(false);
  });

  it('caches results across calls', () => {
    const file = writeFixture({ '/v2/usercollection/daily_sleep': { get: {} } });
    const loader = createSchemaLoader(file);
    const a = loader.listAllAvailablePaths();
    const b = loader.listAllAvailablePaths();
    expect(a).toBe(b); // same string reference (cached)
  });
});
