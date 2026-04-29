import { describe, expect, it, vi } from 'vitest';

describe('registerTools', () => {
  it('registers exactly 5 tools with correct names', async () => {
    const { registerTools } = await import('../../../src/mcp/tools.js');
    const calls: string[] = [];
    const fakeServer = {
      registerTool: vi.fn((name: string) => {
        calls.push(name);
      }),
    } as unknown as Parameters<typeof registerTools>[0]['server'];
    registerTools({
      server: fakeServer,
      authManager: {
        getValidAccessToken: async () => 'tok',
        getCurrentTokens: async () => null,
        setTokens: async () => {},
        clear: async () => {},
        registerCurrentFlow: () => {},
        cancelCurrentFlow: () => {},
      },
      client: {
        get: async () => ({ status: 200, data: { data: [], next_token: null } }),
      },
      schemaLoader: {
        listAllAvailablePaths: () => 'GET /v2/...',
        validatePath: () => true,
      },
      startReauth: async () => 'http://localhost:54321/auth',
    });
    expect(calls.sort()).toEqual([
      'oura_api_get',
      'oura_api_list_paths',
      'oura_auth_status',
      'oura_authenticate',
      'oura_clear_auth',
    ]);
  });
});

describe('runApiGet (via tools handler)', () => {
  it('paginates with max_pages and concatenates data', async () => {
    const { runApiGetForTest } = await import('../../../src/mcp/tools.js');
    let call = 0;
    const client = {
      get: vi.fn(async (_path: string, params?: Record<string, string | number>) => {
        call++;
        if (params?.next_token === 'p2') {
          return { status: 200, data: { data: ['c'], next_token: null } };
        }
        if (params?.next_token === 'p1') {
          return { status: 200, data: { data: ['b'], next_token: 'p2' } };
        }
        return { status: 200, data: { data: ['a'], next_token: 'p1' } };
      }),
    };
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/heartrate',
      maxPages: 5,
    });
    expect(call).toBe(3);
    expect(result.structuredContent?.pages_fetched).toBe(3);
    expect(result.structuredContent?.has_more).toBe(false);
    expect(result.structuredContent?.data).toEqual(['a', 'b', 'c']);
  });

  it('respects max_pages limit and sets has_more=true', async () => {
    const { runApiGetForTest } = await import('../../../src/mcp/tools.js');
    const client = {
      get: vi.fn(async (_path: string, params?: Record<string, string | number>) => {
        const next = params?.next_token ? Number(String(params.next_token)) + 1 : 1;
        return { status: 200, data: { data: [`p${next}`], next_token: String(next) } };
      }),
    };
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/heartrate',
      maxPages: 2,
    });
    expect(result.structuredContent?.pages_fetched).toBe(2);
    expect(result.structuredContent?.has_more).toBe(true);
  });
});
