import { z } from 'zod';

export const PathSchema = z
  .string()
  .regex(/^\/v2\//, 'Path must start with /v2/')
  .refine(
    (p) => {
      if (p.includes('..') || p.includes('\\')) return false;
      // biome-ignore lint/suspicious/noControlCharactersInRegex: detecting control chars is the point
      if (/[\x00-\x1F]/.test(p)) return false;
      if (/(?:%2E){2}/i.test(p)) return false;
      if (/%2F/i.test(p)) return false;
      return true;
    },
    { message: 'Invalid characters in path (path traversal prevention)' },
  );
