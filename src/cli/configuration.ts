import path from 'node:path';
import { CONFIG_FILE_PERMISSION } from '../constants.js';
import { atomicWriteFile } from '../utils/atomic-write.js';
import { getConfigDir } from '../utils/config-dir.js';
import type { Credentials } from './prompts.js';

export async function saveConfig(creds: Credentials): Promise<void> {
  const file = path.join(getConfigDir(), 'config.json');
  const data = {
    schemaVersion: 1,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    callbackPort: creds.callbackPort,
  };
  return atomicWriteFile(file, JSON.stringify(data, null, 2), {
    mode: CONFIG_FILE_PERMISSION,
  });
}
