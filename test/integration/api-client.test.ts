import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createOuraClient } from '../../src/api/client.js';
import { OuraApiError } from '../../src/api/errors.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createOuraClient', () => {
  it('GETs and returns parsed JSON with Bearer header', async () => {
    let receivedAuth = '';
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', ({ request }) => {
        receivedAuth = request.headers.get('Authorization') ?? '';
        return HttpResponse.json({ data: [{ id: '1' }], next_token: null });
      }),
    );
    const client = createOuraClient({ getAccessToken: async () => 'tok' });
    const res = await client.get('/v2/usercollection/daily_sleep');
    expect(receivedAuth).toBe('Bearer tok');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ data: [{ id: '1' }], next_token: null });
  });

  it('throws OuraApiError on 4xx', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', () =>
        HttpResponse.json({ message: 'unauthorized' }, { status: 401 }),
      ),
    );
    const client = createOuraClient({ getAccessToken: async () => 'tok' });
    await expect(client.get('/v2/usercollection/daily_sleep')).rejects.toBeInstanceOf(OuraApiError);
  });

  it('passes query params', async () => {
    let receivedUrl = '';
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({ data: [] });
      }),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    await client.get('/v2/usercollection/daily_sleep', {
      start_date: '2026-04-01',
      end_date: '2026-04-07',
    });
    expect(receivedUrl).toContain('start_date=2026-04-01');
    expect(receivedUrl).toContain('end_date=2026-04-07');
  });

  it('rejects path not starting with /v2/', async () => {
    const client = createOuraClient({ getAccessToken: async () => 't' });
    await expect(client.get('/oauth/token')).rejects.toThrow(/v2/);
  });

  it('throws OuraApiError on 5xx', async () => {
    server.use(
      http.get('https://api.ouraring.com/v2/usercollection/daily_sleep', () =>
        HttpResponse.json({ message: 'server error' }, { status: 500 }),
      ),
    );
    const client = createOuraClient({ getAccessToken: async () => 't' });
    await expect(client.get('/v2/usercollection/daily_sleep')).rejects.toBeInstanceOf(OuraApiError);
  });
});
