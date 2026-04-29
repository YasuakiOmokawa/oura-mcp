import os from 'node:os';
import path from 'node:path';
import { PACKAGE_NAME } from '../constants.js';

export function getConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  return path.join(base, PACKAGE_NAME);
}
