import os from 'node:os';
import path from 'node:path';
import { defaultMcpEntry, type Integration } from './types.js';

export const cursorUser: Integration = {
  name: 'Cursor (user)',
  configPath: () => path.join(os.homedir(), '.cursor', 'mcp.json'),
  buildEntry: defaultMcpEntry,
};

export const cursorProject: Integration = {
  name: 'Cursor (project)',
  configPath: () => path.join(process.cwd(), '.cursor', 'mcp.json'),
  buildEntry: defaultMcpEntry,
};
