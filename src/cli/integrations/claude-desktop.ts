import os from 'node:os';
import path from 'node:path';
import type { Integration } from './types.js';

export const claudeDesktop: Integration = {
  name: 'Claude Desktop',
  configPath: () => {
    if (os.platform() === 'darwin') {
      return path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Claude',
        'claude_desktop_config.json',
      );
    }
    if (os.platform() === 'win32' && process.env.APPDATA) {
      return path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');
    }
    return null;
  },
  buildEntry: () => ({ command: 'npx', args: ['-y', '@yasuakiomokawa/oura-mcp'] }),
};
