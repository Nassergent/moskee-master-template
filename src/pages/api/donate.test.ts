/**
 * donate.test.ts — Donation API unit tests
 *
 * Coverage:
 * DON-01: Happy path — valid amount + project → Mollie redirect URL
 * DON-02: Bot detection — honeypot fields → 202
 * DON-03: Amount too low → 400
 * DON-04: Amount too high → 400
 * DON-05: Invalid amount format → 400
 * DON-06: Rate limiting → 429
 * DON-07: Demo mode → redirect to /bedankt without Mollie call
 * DON-08: CSRF validation — missing token → 403
 * DON-09: CSRF validation — mismatched token → 403
 * DON-10: Missing origin header → 403
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──

const mockMollieCreate = vi.fn();

vi.mock('@mollie/api-client', () => ({
  createMollieClient: () => ({
    payments: {
      create: mockMollieCreate,
    },
  }),
}));

vi.mock('../../lib/sanity', () => ({
  fetchSettings: vi.fn().mockResolvedValue({
    mosqueName: 'Test Moskee',
    email: 'test@moskee.be',
  }),
}));

vi.mock('../../lib/security', async () => {
  const actual = await vi.importActual<typeof import('../../lib/security')>('../../lib/security');
  return {
    ...actual,
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, source: 'memory' }),
  };
});

vi.mock('../../lib/logic/webhook-validators', () => ({
  generateCorrelationId: () => 'test-correlation-id',
}));

vi.mock('../../lib/env', () => ({
  isMollieDemoMode: vi.fn().mockReturnValue(false),
}));

// ── Helpers ──

function makeRequest(body: Record<string, unknown>, cookie = '__csrf=test-csrf-token') {
  return new Request('https://moskee.be/api/donate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://moskee.be',
      Host: 'moskee.be',
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    amount: 25,
    frequency: 'eenmalig',
    projectId: 'proj-1',
    projectName: 'Ramadan',
    email: 'test@example.com',
    _csrf: 'test-csrf-token',
    ...overrides,
  };
}

// ── Tests ──

describe('POST /api/donate', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('MOLLIE_API_KEY', 'live_test123');
    vi.stubEnv('PUBLIC_SANITY_PROJECT_ID', 'testproject');

    mockMollieCreate.mockResolvedValue({
      getCheckoutUrl: () => 'https://www.mollie.com/checkout/test',
    });

    // Re-import to get fresh module with mocks applied
    const mod = await import('./donate');
    POST = mod.POST;
  });

  it('DON-01: valid donation returns Mollie redirect URL', async () => {
    const request = makeRequest(validBody());
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.redirectUrl).toBe('https://www.mollie.com/checkout/test');
    expect(mockMollieCreate).toHaveBeenCalledOnce();
  });

  it('DON-02: honeypot fields return 202', async () => {
    const request = makeRequest(validBody({ website: 'spam.com' }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(202);
    expect(mockMollieCreate).not.toHaveBeenCalled();
  });

  it('DON-03: amount too low returns 400', async () => {
    const request = makeRequest(validBody({ amount: 0.5 }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(400);
  });

  it('DON-04: amount too high returns 400', async () => {
    const request = makeRequest(validBody({ amount: 99999 }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(400);
  });

  it('DON-05: invalid amount format returns 400', async () => {
    const request = makeRequest(validBody({ amount: 'abc' }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(400);
  });

  it('DON-06: rate limited returns 429', async () => {
    const { checkRateLimit } = await import('../../lib/security');
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, source: 'memory' });

    const request = makeRequest(validBody());
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(429);
  });

  it('DON-07: demo mode redirects to /bedankt without Mollie call', async () => {
    const { isMollieDemoMode } = await import('../../lib/env');
    vi.mocked(isMollieDemoMode).mockReturnValue(true);

    const request = makeRequest(validBody());
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.redirectUrl).toContain('/bedankt');
    expect(json.redirectUrl).toContain('demo=true');
    expect(mockMollieCreate).not.toHaveBeenCalled();
  });

  it('DON-08: missing CSRF token returns 403', async () => {
    const request = makeRequest(validBody({ _csrf: undefined }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(403);
  });

  it('DON-09: mismatched CSRF token returns 403', async () => {
    const request = makeRequest(validBody({ _csrf: 'wrong-token' }));
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(403);
  });

  it('DON-10: missing origin header returns 403', async () => {
    const request = new Request('https://moskee.be/api/donate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'moskee.be',
        Cookie: '__csrf=test-csrf-token',
      },
      body: JSON.stringify(validBody()),
    });
    const url = new URL('https://moskee.be/api/donate');
    const response = await POST({ request, url });

    expect(response.status).toBe(403);
  });
});
