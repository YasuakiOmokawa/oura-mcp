import os from 'node:os';
import path from 'node:path';
import type { Integration } from './types.js';

export const cursorUser: Integration = {
  name: 'Cursor (user)',
  configPath: () => path.join(os.homedir(), '.cursor', 'mcp.json'),
  buildEntry: () => ({ command: 'npx', args: ['-y', '@yasuakiomokawa/oura-mcp'] }),
};

export const cursorProject: Integration = {
  name: 'Cursor (project)',
  configPath: () => path.join(process.cwd(), '.cursor', 'mcp.json'),
  buildEntry: () => ({ command: 'npx', args: ['-y', '@yasuakiomokawa/oura-mcp'] }),
};
