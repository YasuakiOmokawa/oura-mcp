#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

// フェーズ0 検証で確定 (2026-04-29): Redoc が参照する spec-url
const SCHEMA_URL =
  process.env.OURA_OPENAPI_URL ?? 'https://cloud.ouraring.com/v2/static/json/openapi-1.29.json';

const ROOT = path.resolve(import.meta.dirname, '..');
const FULL_PATH = path.join(ROOT, 'openapi', 'oura-v2.json');
const MIN_PATH = path.join(ROOT, 'openapi', 'minimal', 'oura-v2.json');

type Op = { summary?: string; description?: string };
type Schema = { paths: Record<string, Record<string, Op>> };

async function main(): Promise<void> {
  console.error(`Fetching ${SCHEMA_URL}...`);
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const text = await res.text();
  const full =
    SCHEMA_URL.endsWith('.yaml') || SCHEMA_URL.endsWith('.yml')
      ? parseYaml(text)
      : JSON.parse(text);

  await mkdir(path.dirname(FULL_PATH), { recursive: true });
  await writeFile(FULL_PATH, JSON.stringify(full, null, 2));
  console.error(`Wrote ${FULL_PATH}`);

  const minimal = minimize(full as Schema);
  await mkdir(path.dirname(MIN_PATH), { recursive: true });
  await writeFile(MIN_PATH, JSON.stringify(minimal, null, 2));
  console.error(`Wrote ${MIN_PATH}`);
}

function minimize(full: Schema): { paths: Record<string, Record<string, { summary?: string }>> } {
  const paths: Record<string, Record<string, { summary?: string }>> = {};
  for (const [p, item] of Object.entries(full.paths)) {
    if (!p.startsWith('/v2/')) continue;
    // Oura sandbox endpoints は本番で使えないため除外
    if (p.startsWith('/v2/sandbox/')) continue;
    const methods: Record<string, { summary?: string }> = {};
    for (const [method, op] of Object.entries(item)) {
      if (method !== 'get') continue;
      methods[method] = { summary: op.summary };
    }
    if (Object.keys(methods).length > 0) paths[p] = methods;
  }
  return { paths };
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
