import { describe, expect, it } from 'vitest';
import { assertAllowedHost } from '../../../src/api/client.js';

describe('assertAllowedHost', () => {
  it('accepts api.ouraring.com', () => {
    expect(() =>
      assertAllowedHost('https://api.ouraring.com/v2/usercollection/daily_sleep'),
    ).not.toThrow();
  });

  it('rejects other hosts', () => {
    expect(() => assertAllowedHost('https://evil.com/v2/foo')).toThrow(/non-Oura host/i);
  });

  it('rejects userinfo @-trick that hides real host', () => {
    expect(() => assertAllowedHost('https://api.ouraring.com@evil.com/v2/foo')).toThrow(
      /non-Oura host/i,
    );
  });

  it('rejects http (non-TLS) variant', () => {
    expect(() => assertAllowedHost('http://api.ouraring.com/v2/foo')).toThrow(/scheme/i);
  });

  it('rejects subdomain spoofing', () => {
    expect(() => assertAllowedHost('https://api.ouraring.com.evil.com/v2/foo')).toThrow(
      /non-Oura host/i,
    );
  });
});
