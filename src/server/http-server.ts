import crypto from 'node:crypto';
import http from 'node:http';
import {
  AUTH_TIMEOUT_MS,
  DEFAULT_CALLBACK_PORT,
  OURA_BIND_HOST,
  OURA_CALLBACK_PATH,
} from '../constants.js';
import { log } from '../utils/log.js';

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>oura-mcp</title></head>
<body style="font-family:sans-serif;padding:2em;text-align:center">
  <h1>Authorization successful</h1>
  <p>You can now close this tab and return to the terminal.</p>
  <script>setTimeout(() => window.close(), 3000);</script>
</body></html>`;

export type CallbackServerOptions = {
  expectedState: string;
  port?: number;
  timeoutMs?: number;
};

export type CallbackServerHandle = {
  port: number;
  codePromise: Promise<string>;
  stop: () => void;
};

export async function startCallbackServer(
  opts: CallbackServerOptions,
): Promise<CallbackServerHandle> {
  const port = opts.port ?? DEFAULT_CALLBACK_PORT;
  const timeoutMs = opts.timeoutMs ?? AUTH_TIMEOUT_MS;
  const expectedStateBuf = Buffer.from(opts.expectedState);

  let resolveCode!: (code: string) => void;
  let rejectCode!: (err: Error) => void;
  const codePromise = new Promise<string>((res, rej) => {
    resolveCode = res;
    rejectCode = rej;
  });

  let settled = false;
  let timer: NodeJS.Timeout;
  let closeTimer: NodeJS.Timeout | undefined;

  const onSig = () => finish();

  function finish(): void {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (closeTimer) clearTimeout(closeTimer);
    process.off('SIGINT', onSig);
    process.off('SIGTERM', onSig);
    server.close();
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${OURA_BIND_HOST}:${port}`);
    if (url.pathname !== OURA_CALLBACK_PATH) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const state = url.searchParams.get('state') ?? '';
    const code = url.searchParams.get('code');
    const stateBuf = Buffer.from(state);
    const stateMatches =
      stateBuf.length === expectedStateBuf.length &&
      crypto.timingSafeEqual(stateBuf, expectedStateBuf);
    if (!stateMatches) {
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end('State mismatch');
      rejectCode(new Error('OAuth state mismatch (CSRF check failed)'));
      finish();
      return;
    }
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing code');
      rejectCode(new Error('OAuth callback missing code'));
      finish();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(SUCCESS_HTML);
    resolveCode(code);
    closeTimer = setTimeout(finish, 1000);
  });

  await new Promise<void>((res, rej) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        rej(new Error(`Port ${port} is already in use. Set OURA_CALLBACK_PORT to another port.`));
      } else {
        rej(err);
      }
    });
    server.listen(port, OURA_BIND_HOST, () => res());
  });

  timer = setTimeout(() => {
    log.warn('auth.timeout', { port });
    rejectCode(new Error('OAuth flow timeout (5 min)'));
    finish();
  }, timeoutMs);

  process.once('SIGINT', onSig);
  process.once('SIGTERM', onSig);

  return { port, codePromise, stop: finish };
}
