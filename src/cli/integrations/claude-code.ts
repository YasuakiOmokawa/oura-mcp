import os from 'node:os';
import path from 'node:path';
import { defaultMcpEntry, type Integration } from './types.js';

// Claude Code reads user-level MCP servers from ~/.claude.json.
// ~/.claude/settings.json is for other fields (permissions / hooks), and
// `mcpServers` written there is ignored.
export const claudeCodeUser: Integration = {
  name: 'Claude Code (user)',
  configPath: () => path.join(os.homedir(), '.claude.json'),
  buildEntry: defaultMcpEntry,
};

// At the project level, <project>/.mcp.json is the official location for MCP servers.
// .claude/settings.local.json is for permissions; `mcpServers` there is not read.
export const claudeCodeProject: Integration = {
  name: 'Claude Code (project)',
  configPath: () => path.join(process.cwd(), '.mcp.json'),
  buildEntry: defaultMcpEntry,
};
