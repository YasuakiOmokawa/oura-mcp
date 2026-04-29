import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createOuraClient } from '../../src/api/client.js';
import { runApiGetForTest } from '../../src/mcp/tools.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('pagination (tools-level integration)', () => {
  it('fetches single page when max_pages=1 and has more', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/heartrate', () =>
        HttpResponse.json({ data: ['a'], next_token: 'p1' }),
      ),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/heartrate',
      maxPages: 1,
    });
    expect(result.structuredContent?.pages_fetched).toBe(1);
    expect(result.structuredContent?.has_more).toBe(true);
    expect(result.structuredContent?.next_token).toBe('p1');
    expect(result.content[0]?.text).toContain('More data available');
  });

  it('follows next_token up to max_pages and concatenates', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/heartrate', ({ request }) => {
        const u = new URL(request.url);
        const next = u.searchParams.get('next_token');
        if (next === 'p2') return HttpResponse.json({ data: ['c'], next_token: null });
        if (next === 'p1') return HttpResponse.json({ data: ['b'], next_token: 'p2' });
        return HttpResponse.json({ data: ['a'], next_token: 'p1' });
      }),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/heartrate',
      maxPages: 5,
    });
    expect(result.structuredContent?.pages_fetched).toBe(3);
    expect(result.structuredContent?.has_more).toBe(false);
    expect(result.structuredContent?.data).toEqual(['a', 'b', 'c']);
  });

  it('passes initial params alongside next_token', async () => {
    let pageCount = 0;
    const seenParams: Array<Record<string, string | null>> = [];
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', ({ request }) => {
        const u = new URL(request.url);
        seenParams.push({
          start_date: u.searchParams.get('start_date'),
          end_date: u.searchParams.get('end_date'),
          next_token: u.searchParams.get('next_token'),
        });
        pageCount++;
        return HttpResponse.json({
          data: [pageCount],
          next_token: pageCount < 2 ? 'next' : null,
        });
      }),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    await runApiGetForTest({
      client,
      path: '/v2/usercollection/daily_sleep',
      params: { start_date: '2026-04-01', end_date: '2026-04-07' },
      maxPages: 5,
    });
    expect(seenParams[0]).toEqual({
      start_date: '2026-04-01',
      end_date: '2026-04-07',
      next_token: null,
    });
    expect(seenParams[1]).toEqual({
      start_date: '2026-04-01',
      end_date: '2026-04-07',
      next_token: 'next',
    });
  });

  it('maps OuraApiError to isError result', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', () =>
        HttpResponse.json({ message: 'unauthorized' }, { status: 401 }),
      ),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/daily_sleep',
      maxPages: 1,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/token invalid/i);
  });

  it('maps 429 to rate limited message', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', () =>
        HttpResponse.json({}, { status: 429 }),
      ),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    const result = await runApiGetForTest({
      client,
      path: '/v2/usercollection/daily_sleep',
      maxPages: 1,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/rate limited/i);
  });
});
