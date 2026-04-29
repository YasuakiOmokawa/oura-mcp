import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OuraClient } from '../api/client.js';
import { OuraApiError } from '../api/errors.js';
import type { AuthManager } from '../auth/auth-manager.js';
import { RefreshTokenExpiredError } from '../auth/oauth.js';
import type { SchemaLoader } from '../openapi/schema-loader.js';
import { log } from '../utils/log.js';
import { PathSchema } from './path-schema.js';

export type ToolDeps = {
  server: McpServer;
  authManager: AuthManager;
  client: OuraClient;
  schemaLoader: SchemaLoader;
  startReauth: () => Promise<string>;
};

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: {
    status: number;
    data: unknown;
    next_token: string | null;
    pages_fetched: number;
    has_more: boolean;
  };
  isError?: boolean;
};

export function registerTools(deps: ToolDeps): void {
  registerAuthTools(deps);
  registerApiTools(deps);
}

function registerAuthTools({ server, authManager, startReauth }: ToolDeps): void {
  server.registerTool(
    'oura_authenticate',
    {
      title: 'Authenticate with Oura',
      description:
        'Start OAuth authorization flow. Returns a URL to open in browser. Used for re-authentication after refresh_token expires.',
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      const url = await startReauth();
      return {
        content: [
          {
            type: 'text',
            text: `Authorization URL:\n${url}\n\nOpen this in your browser. Times out in 5 minutes.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'oura_auth_status',
    {
      title: 'Authentication status',
      description: 'Check current authentication state and token expiry.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const tokens = await authManager.getCurrentTokens();
      if (!tokens) {
        return {
          content: [
            {
              type: 'text',
              text: 'Not authenticated. Run `npx oura-mcp configure` or `oura_authenticate`.',
            },
          ],
        };
      }
      const valid = Date.now() < tokens.expires_at;
      return {
        content: [
          {
            type: 'text',
            text: `Authenticated. expires_at=${new Date(tokens.expires_at).toISOString()} valid=${valid} scope=${tokens.scope}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'oura_clear_auth',
    {
      title: 'Clear authentication',
      description: 'Delete stored tokens. Re-authenticate via `oura_authenticate` after this.',
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      await authManager.clear();
      log.info('auth.cleared');
      return {
        content: [
          {
            type: 'text',
            text: 'Tokens cleared. Run `oura_authenticate` to re-authenticate.',
          },
        ],
      };
    },
  );
}

function registerApiTools({ server, client, schemaLoader }: ToolDeps): void {
  server.registerTool(
    'oura_api_list_paths',
    {
      title: 'List Oura API endpoints',
      description: 'List all available Oura API v2 GET endpoints with summaries.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: 'text', text: schemaLoader.listAllAvailablePaths() }],
    }),
  );

  server.registerTool(
    'oura_api_get',
    {
      title: 'Oura API GET',
      description:
        'Generic GET to Oura Ring API v2. Use oura_api_list_paths to see endpoints. Pagination via max_pages or pass next_token in params.',
      inputSchema: {
        path: PathSchema.describe('Path starting with /v2/, e.g. "/v2/usercollection/daily_sleep"'),
        params: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional()
          .describe(
            'Query params. Daily endpoints: start_date/end_date (YYYY-MM-DD). Time-series: start_datetime/end_datetime (ISO 8601). Pass next_token to continue.',
          ),
        max_pages: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Auto-follow next_token up to N pages (default 1).'),
      },
      outputSchema: {
        status: z.number().describe('HTTP status of the last fetched page'),
        data: z.unknown().describe('Concatenated data array (or single object) from Oura'),
        next_token: z.string().nullable().describe('Cursor for next page or null'),
        pages_fetched: z.number().int().describe('Number of pages fetched'),
        has_more: z.boolean().describe('True if more pages exist beyond fetched'),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ path, params, max_pages }) => {
      if (!schemaLoader.validatePath(path)) {
        return {
          content: [
            {
              type: 'text',
              text: `Path '${path}' not in OpenAPI schema. Use oura_api_list_paths.`,
            },
          ],
          isError: true,
        };
      }
      return runApiGet({ client, path, params, maxPages: max_pages ?? 1 });
    },
  );
}

type RunApiGetArgs = {
  client: OuraClient;
  path: string;
  params?: Record<string, string | number>;
  maxPages: number;
};

async function runApiGet(args: RunApiGetArgs): Promise<ToolResult> {
  return runApiGetInner(args).catch(mapApiError);
}

async function runApiGetInner(args: RunApiGetArgs): Promise<ToolResult> {
  const collected: unknown[] = [];
  let nextToken: string | null = null;
  let pages = 0;
  let lastStatus = 0;
  let currentParams: Record<string, string | number> = { ...(args.params ?? {}) };

  while (pages < args.maxPages) {
    if (nextToken) currentParams = { ...currentParams, next_token: nextToken };
    const res = await args.client.get(args.path, currentParams);
    lastStatus = res.status;
    const body = res.data as { data?: unknown[]; next_token?: string | null };
    if (Array.isArray(body.data)) collected.push(...body.data);
    else collected.push(body);
    pages += 1;
    nextToken = body.next_token ?? null;
    if (!nextToken) break;
  }
  const hasMore = nextToken !== null;
  const text = `Fetched ${pages} page(s) (${collected.length} record(s)) from ${args.path}.${
    hasMore ? '\nMore data available; pass next_token to continue.' : ''
  }`;
  return {
    content: [{ type: 'text', text }],
    structuredContent: {
      status: lastStatus,
      data: collected,
      next_token: nextToken,
      pages_fetched: pages,
      has_more: hasMore,
    },
  };
}

function mapApiError(err: unknown): ToolResult {
  if (err instanceof RefreshTokenExpiredError) {
    return {
      content: [
        {
          type: 'text',
          text: 'Oura: refresh_token expired. Run `oura_authenticate` (in chat) or `npx oura-mcp configure` (in terminal) to re-authenticate.',
        },
      ],
      isError: true,
    };
  }
  if (err instanceof OuraApiError) {
    if (err.status === 401) {
      return {
        content: [
          {
            type: 'text',
            text: 'Oura API: token invalid. Run oura_authenticate to re-authenticate.',
          },
        ],
        isError: true,
      };
    }
    if (err.status === 429) {
      return {
        content: [{ type: 'text', text: 'Oura API: rate limited' }],
        isError: true,
      };
    }
    if (err.status >= 500) {
      return {
        content: [{ type: 'text', text: `Oura API: server error ${err.status}` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Oura API: ${err.status} ${JSON.stringify(err.body).slice(0, 200)}`,
        },
      ],
      isError: true,
    };
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return {
      content: [{ type: 'text', text: 'Oura API: request timeout' }],
      isError: true,
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: `Oura API: network error: ${msg}` }],
    isError: true,
  };
}

// テスト用 export（runApiGet を直接 assert できるように）
export const runApiGetForTest = runApiGet;
