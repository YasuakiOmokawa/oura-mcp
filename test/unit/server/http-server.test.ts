import { afterEach, describe, expect, it } from 'vitest';
import { startCallbackServer } from '../../../src/server/http-server.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

async function pickPort(): Promise<number> {
  // High random port (49152-65535) to avoid collisions
  return 49152 + Math.floor(Math.random() * 16000);
}

describe('startCallbackServer', () => {
  it('rejects on state mismatch', async () => {
    const port = await pickPort();
    const handle = await startCallbackServer({
      expectedState: 'good',
      timeoutMs: 1000,
      port,
    });
    cleanups.push(handle.stop);

    const rejection = handle.codePromise.catch((e: Error) => e);
    const res = await fetch(`http://127.0.0.1:${port}/callback?code=c&state=bad`);
    expect(res.status).toBe(400);
    const err = await rejection;
    expect((err as Error).message).toMatch(/state/i);
  });

  it('returns 404 for non-callback paths', async () => {
    const port = await pickPort();
    const handle = await startCallbackServer({
      expectedState: 's',
      timeoutMs: 1000,
      port,
    });
    cleanups.push(handle.stop);

    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(404);
  });

  it('rejects after timeout', async () => {
    const port = await pickPort();
    const handle = await startCallbackServer({
      expectedState: 's',
      timeoutMs: 100,
      port,
    });
    cleanups.push(handle.stop);
    const err = (await handle.codePromise.catch((e: Error) => e)) as Error;
    expect(err.message).toMatch(/timeout/i);
  });

  it('resolves with code on valid callback', async () => {
    const port = await pickPort();
    const handle = await startCallbackServer({
      expectedState: 'st',
      timeoutMs: 5000,
      port,
    });
    cleanups.push(handle.stop);

    const res = await fetch(`http://127.0.0.1:${port}/callback?code=valid&state=st`);
    expect(res.status).toBe(200);
    expect(await handle.codePromise).toBe('valid');
  });

  it('throws clear EADDRINUSE message on port conflict', async () => {
    const port = await pickPort();
    const a = await startCallbackServer({ expectedState: 's', timeoutMs: 1000, port });
    cleanups.push(a.stop);
    await expect(
      startCallbackServer({ expectedState: 's', timeoutMs: 1000, port }),
    ).rejects.toThrow(/already in use/i);
  });

  it('rejects when code missing', async () => {
    const port = await pickPort();
    const handle = await startCallbackServer({
      expectedState: 'st',
      timeoutMs: 1000,
      port,
    });
    cleanups.push(handle.stop);

    const rejection = handle.codePromise.catch((e: Error) => e);
    const res = await fetch(`http://127.0.0.1:${port}/callback?state=st`);
    expect(res.status).toBe(400);
    const err = await rejection;
    expect((err as Error).message).toMatch(/code/i);
  });
});
