import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { log } from '../utils/log.js';

const MinimalSchemaSchema = z.object({
  paths: z.record(
    z.string(),
    z.object({
      get: z
        .object({
          summary: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

type MinimalSchema = z.infer<typeof MinimalSchemaSchema>;

export type SchemaLoader = {
  listAllAvailablePaths: () => string;
  validatePath: (path: string) => boolean;
};

export function createSchemaLoader(filePath: string): SchemaLoader {
  let cached: MinimalSchema | null = null;
  let listCached: string | null = null;

  function load(): MinimalSchema {
    if (cached) return cached;
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    const result = MinimalSchemaSchema.safeParse(parsed);
    if (!result.success) {
      log.error('schema.invalid', { error: result.error.message, file: filePath });
      throw new Error(`Invalid minimal schema at ${filePath}`);
    }
    cached = result.data;
    return cached;
  }

  return {
    listAllAvailablePaths: () => {
      if (listCached) return listCached;
      const schema = load();
      const lines = Object.entries(schema.paths)
        .filter(([_, item]) => item.get != null)
        .map(([p, item]) => `  GET ${p}${item.get?.summary ? `  ${item.get.summary}` : ''}`)
        .sort();
      listCached = lines.join('\n');
      return listCached;
    },
    validatePath: (p) => {
      const schema = load();
      return schema.paths[p]?.get != null;
    },
  };
}
