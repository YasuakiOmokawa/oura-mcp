import { redact } from './redact.js';

const ORDER = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof ORDER;

const CURRENT_LEVEL: Level = (() => {
  const raw = (process.env.OURA_LOG_LEVEL ?? 'info').toLowerCase();
  return (raw in ORDER ? raw : 'info') as Level;
})();

function format(level: Level, event: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const payload = data === undefined ? '' : ` ${JSON.stringify(redact(data))}`;
  return `${ts} [${level}] ${event}${payload}`;
}

function emit(level: Level, event: string, data?: unknown): void {
  if (ORDER[level] < ORDER[CURRENT_LEVEL]) return;
  console.error(format(level, event, data));
}

export const log = {
  debug: (event: string, data?: unknown) => emit('debug', event, data),
  info: (event: string, data?: unknown) => emit('info', event, data),
  warn: (event: string, data?: unknown) => emit('warn', event, data),
  error: (event: string, data?: unknown) => emit('error', event, data),
};
