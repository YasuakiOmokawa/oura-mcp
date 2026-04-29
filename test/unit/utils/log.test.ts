import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('log', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('emits info logs by default', async () => {
    delete process.env.OURA_LOG_LEVEL;
    const { log } = await import('../../../src/utils/log.js');
    log.info('event', { foo: 'bar' });
    expect(stderrSpy).toHaveBeenCalled();
    const out = stderrSpy.mock.calls[0]?.[0] as string;
    expect(out).toMatch(/\[info\] event/);
  });

  it('skips debug when level is info', async () => {
    process.env.OURA_LOG_LEVEL = 'info';
    const { log } = await import('../../../src/utils/log.js');
    log.debug('event');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('emits debug when level is debug', async () => {
    process.env.OURA_LOG_LEVEL = 'debug';
    const { log } = await import('../../../src/utils/log.js');
    log.debug('event');
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('redacts sensitive payload', async () => {
    process.env.OURA_LOG_LEVEL = 'info';
    const { log } = await import('../../../src/utils/log.js');
    log.info('auth.refresh', { access_token: 'secret' });
    const out = stderrSpy.mock.calls[0]?.[0] as string;
    expect(out).toContain('"access_token":"***"');
    expect(out).not.toContain('secret');
  });

  it('emits error level always', async () => {
    process.env.OURA_LOG_LEVEL = 'error';
    const { log } = await import('../../../src/utils/log.js');
    log.error('boom');
    log.warn('warn');
    log.info('info');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });
});
