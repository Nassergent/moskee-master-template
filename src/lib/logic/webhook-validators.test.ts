/**
 * webhook-validators.test.ts — WHTEST-04: HMAC Signature Verification
 *
 * Tests verifyHmacTimingSafe() directly — pure async function, no mocks needed.
 * crypto.subtle is built-in (Node 18+ / Web Crypto API).
 *
 * Test coverage:
 * - WHTEST-04a: valid body + matching signature → true
 * - WHTEST-04b: tampered body + original signature → false
 * - WHTEST-04c: wrong secret → false
 */

import { describe, it, expect } from 'vitest';
import { verifyHmacTimingSafe } from './webhook-validators';

// ── Helper: generate a valid HMAC-SHA256 base64 signature ──

async function signBody(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── WHTEST-04: HMAC signature verification ──

describe('WHTEST-04: HMAC signature verification', () => {
  it('valid body + matching signature returns true', async () => {
    const body = 'id=tr_test123';
    const sig = await signBody('my-secret', body);
    expect(await verifyHmacTimingSafe('my-secret', body, sig)).toBe(true);
  });

  it('tampered body + original signature returns false', async () => {
    const original = 'id=tr_test123';
    const tampered = 'id=tr_attacker999';
    const sig = await signBody('my-secret', original);
    expect(await verifyHmacTimingSafe('my-secret', tampered, sig)).toBe(false);
  });

  it('wrong secret returns false', async () => {
    const body = 'id=tr_test123';
    const sig = await signBody('real-secret', body);
    expect(await verifyHmacTimingSafe('wrong-secret', body, sig)).toBe(false);
  });
});
