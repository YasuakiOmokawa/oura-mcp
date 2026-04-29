import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generatePKCE, generateState } from '../../../src/auth/token-utils.js';

describe('generatePKCE', () => {
  it('returns 43+ char URL-safe verifier', () => {
    const { codeVerifier } = generatePKCE();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('challenge is base64url(sha256(verifier))', () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const expected = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    expect(codeChallenge).toBe(expected);
  });

  it('different calls produce different verifiers', () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe('generateState', () => {
  it('returns URL-safe random string of length >= 16', () => {
    const s = generateState();
    expect(s.length).toBeGreaterThanOrEqual(16);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('different calls produce different states', () => {
    expect(generateState()).not.toBe(generateState());
  });
});
