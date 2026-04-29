import os from 'node:os';
import path from 'node:path';
import { defaultMcpEntry, type Integration } from './types.js';

// Claude Code は user 側の MCP server を ~/.claude.json から読む。
// ~/.claude/settings.json は別のフィールド (permissions / hooks 等) 用で
// mcpServers を書いても無視されるので注意。
export const claudeCodeUser: Integration = {
  name: 'Claude Code (user)',
  configPath: () => path.join(os.homedir(), '.claude.json'),
  buildEntry: defaultMcpEntry,
};

// project 側は <project>/.mcp.json が公式 MCP server 配置先。
// .claude/settings.local.json は permissions 用で mcpServers は読まれない。
export const claudeCodeProject: Integration = {
  name: 'Claude Code (project)',
  configPath: () => path.join(process.cwd(), '.mcp.json'),
  buildEntry: defaultMcpEntry,
};
