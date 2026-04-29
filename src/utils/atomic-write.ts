import { chmod, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function atomicWriteFile(
  filePath: string,
  content: string,
  opts?: { mode?: number },
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  return writeFile(tmp, content, opts?.mode != null ? { mode: opts.mode } : undefined)
    .then(() => (opts?.mode != null ? chmod(tmp, opts.mode) : Promise.resolve()))
    .then(() => rename(tmp, filePath))
    .catch((err: unknown) =>
      unlink(tmp)
        .catch(() => {})
        .then(() => {
          throw err;
        }),
    );
}
