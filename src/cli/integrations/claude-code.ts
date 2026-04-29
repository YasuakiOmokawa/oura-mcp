import os from 'node:os';
import path from 'node:path';
import type { Integration } from './types.js';

export const claudeCodeUser: Integration = {
  name: 'Claude Code (user)',
  configPath: () => path.join(os.homedir(), '.claude', 'settings.json'),
  buildEntry: () => ({ command: 'oura-mcp' }),
};

export const claudeCodeProject: Integration = {
  name: 'Claude Code (project)',
  configPath: () => path.join(process.cwd(), '.claude', 'settings.local.json'),
  buildEntry: () => ({ command: 'oura-mcp' }),
};
