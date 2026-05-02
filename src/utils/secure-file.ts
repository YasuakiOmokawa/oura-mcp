import { chmod, stat } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE_PERMISSION } from '../constants.js';
import { log } from './log.js';

const CONFIG_DIR_PERMISSION = 0o700;

// Self-heal local credential file permissions on every read so we never trust
// a config / tokens file that another process or a sloppy backup left readable
// to the group or to other users.
export async function ensureSecureFile(filePath: string): Promise<void> {
  const fileStat = await stat(filePath).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });
  if (!fileStat) return;

  const fileMode = fileStat.mode & 0o777;
  if (fileMode !== CONFIG_FILE_PERMISSION) {
    log.warn('secure_file.chmod', { path: filePath, from: fileMode.toString(8), to: '600' });
    await chmod(filePath, CONFIG_FILE_PERMISSION);
  }

  const dir = path.dirname(filePath);
  const dirStat = await stat(dir).catch(() => null);
  if (!dirStat) return;
  const dirMode = dirStat.mode & 0o777;
  if (dirMode !== CONFIG_DIR_PERMISSION) {
    log.warn('secure_file.chmod_dir', { path: dir, from: dirMode.toString(8), to: '700' });
    await chmod(dir, CONFIG_DIR_PERMISSION);
  }
}
