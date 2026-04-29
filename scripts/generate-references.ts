#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FULL = path.join(ROOT, 'openapi', 'oura-v2.json');
const MAPPINGS = path.join(ROOT, 'openapi', 'path-mappings.json');
const OUT = path.join(ROOT, 'skills', 'oura-api-skill', 'references');

type Param = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
};

type Op = {
  summary?: string;
  description?: string;
  parameters?: Param[];
};

type Schema = { paths: Record<string, Record<string, Op>> };

async function main(): Promise<void> {
  const schema = JSON.parse(await readFile(FULL, 'utf-8')) as Schema;
  const mappings = JSON.parse(await readFile(MAPPINGS, 'utf-8')) as Record<string, string>;
  await mkdir(OUT, { recursive: true });

  // Oura OpenAPI は tags が空のため path prefix → category にマッピング
  // 派生 path (/{document_id} 等) を取りこぼさないよう長い prefix から照合する
  const prefixes = Object.keys(mappings).sort((a, b) => b.length - a.length);
  function categoryFor(p: string): string | null {
    for (const prefix of prefixes) {
      if (p.startsWith(prefix)) return mappings[prefix] ?? null;
    }
    return null;
  }

  const byCategory: Record<string, Array<{ path: string; method: string; op: Op }>> = {};
  for (const [p, item] of Object.entries(schema.paths)) {
    if (!p.startsWith('/v2/')) continue;
    if (p.startsWith('/v2/sandbox/')) continue;
    const cat = categoryFor(p);
    if (!cat) {
      console.warn(`No mapping for path "${p}", skipping`);
      continue;
    }
    for (const [method, op] of Object.entries(item)) {
      if (method !== 'get') continue;
      let list = byCategory[cat];
      if (!list) {
        list = [];
        byCategory[cat] = list;
      }
      list.push({ path: p, method, op });
    }
  }

  for (const [filename, entries] of Object.entries(byCategory)) {
    const md = renderMarkdown(filename, entries);
    await writeFile(path.join(OUT, `${filename}.md`), md);
  }
  console.error(`Generated ${Object.keys(byCategory).length} reference file(s) in ${OUT}`);
}

function renderMarkdown(
  name: string,
  entries: Array<{ path: string; method: string; op: Op }>,
): string {
  const lines = [
    '<!-- AUTO-GENERATED. DO NOT EDIT. Run `npm run generate:references`. -->',
    `# ${name}`,
    '',
  ];
  for (const { path: p, method, op } of entries) {
    lines.push(`## ${method.toUpperCase()} ${p}`);
    if (op.summary) lines.push(op.summary);
    if (op.description) lines.push('', op.description);
    if (op.parameters?.length) {
      lines.push('', '### Parameters');
      for (const param of op.parameters) {
        const req = param.required ? 'required' : 'optional';
        lines.push(`- \`${param.name}\` (${param.in}, ${req}): ${param.description ?? ''}`);
      }
    }
    lines.push('', '');
  }
  return lines.join('\n');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
