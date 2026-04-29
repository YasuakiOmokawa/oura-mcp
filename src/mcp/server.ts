import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../constants.js';
import { registerTools, type ToolDeps } from './tools.js';

export function createOuraMcpServer(deps: Omit<ToolDeps, 'server'>): McpServer {
  const server = new McpServer({ name: PACKAGE_NAME, version: PACKAGE_VERSION });
  registerTools({ server, ...deps });
  return server;
}
