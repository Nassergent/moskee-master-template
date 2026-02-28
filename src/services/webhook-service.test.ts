/**
 * webhook-service.test.ts — Webhook Service Tests
 *
 * Coverage:
 * WHTEST-01: processWebhook() returns 503 when Redis times out (slow reject via fake timers)
 * WHTEST-02: processWebhook() returns 503 when Redis is completely unavailable (ECONNREFUSED)
 * WHTEST-03: processWebhook() processes a payment only once — second call returns 'Already processed'
 * WHTEST-05: Single shared vi.mock factory with vi.hoisted refs
 * WHTEST-06: 503 paths emit structured log entry with paymentId + tenantId
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// WHTEST-05: Shared mock refs via vi.hoisted — accessible both in vi.mock factory and in tests
const { mockExists, mockSet, mockDel } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

// WHTEST-05: Single shared vi.mock factory for @upstash/redis
// Use a regular function (not arrow) so vi.fn() is callable as a constructor with `new`
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () {
    return {
      exists: mockExists,
      set: mockSet,
      del: mockDel,
    };
  }),
}));

vi.mock('@mollie/api-client', () => ({
  createMollieClient: vi.fn(() => ({
    payments: {
      get: vi.fn().mockResolvedValue({
        status: 'paid',
        amount: { value: '25.00', currency: 'EUR' },
        metadata: {
          projectId: 'proj_test',
          tenantId: 'tenant_test',
          correlationId: 'corr_test',
          projectName: 'Test Project',
        },
      }),
    },
  })),
}));

vi.mock('../../sanity/lib/client', () => ({
  writeClient: {
    patch: vi.fn(() => ({
      inc: vi.fn(() => ({
        commit: vi.fn().mockResolvedValue({ huidigBedragCents: 2500 }),
      })),
    })),
  },
}));

// Mock payment-service to avoid email dispatch (Resend API calls)
vi.mock('./payment-service', () => ({
  processSuccessfulPayment: vi.fn().mockResolvedValue(undefined),
}));

// Mock sanity fetch helpers to prevent network calls in idempotency test
vi.mock('../lib/sanity', () => ({
  fetchProjectById: vi.fn().mockResolvedValue(null),
  fetchProjectByTitle: vi.fn().mockResolvedValue(null),
}));

// Import AFTER mocks are registered
import { processWebhook } from './webhook-service';

beforeEach(() => {
  // Set env vars before any lazy-init can occur
  // CRITICAL (Pitfall 6): Must NOT start with 'test_' — that triggers demo mode guard
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake-redis.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
  vi.stubEnv('MOLLIE_API_KEY', 'live_fakekeyfortesting');
  vi.stubEnv('SANITY_PROJECT_ID', 'test-tenant-id');

  // Reset all mock implementations per test
  mockExists.mockReset();
  mockSet.mockReset();
  mockDel.mockReset();

  // Default: lock acquires successfully, del succeeds
  mockSet.mockResolvedValue('OK');
  mockDel.mockResolvedValue(1);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers(); // Safety: ensure fake timers never leak to other tests
});

describe('Webhook Service — Redis failure modes + idempotency', () => {
  it('WHTEST-01: returns 503 when Redis times out (slow reject via fake timers)', async () => {
    // Arrange: exists() returns a Promise that rejects after 2000ms
    // This simulates a Redis connection that is up but lagging
    mockExists.mockImplementation(
      () => new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('Redis timeout after 2000ms')), 2000)
      )
    );

    vi.useFakeTimers();
    const resultPromise = processWebhook('tr_timeout001');

    // Advance clock past the 2000ms delay to trigger the rejection
    // Must await — the async variant flushes microtasks between ticks
    await vi.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    vi.useRealTimers();

    expect(result.status).toBe(503);
    expect(result.body).toBe('Service temporarily unavailable');

    // WHTEST-06: structured log must contain paymentId + tenantId
    const errorLog = result.logs.map(l => JSON.parse(l)).find(l => l.level === 'error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.paymentId).toBe('tr_timeout001');
    expect(errorLog?.tenantId).toBeDefined();
  });

  it('WHTEST-02: returns 503 when Redis is completely unavailable (ECONNREFUSED)', async () => {
    // Arrange: exists() rejects immediately — Redis is completely unreachable
    mockExists.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:6379'));

    const result = await processWebhook('tr_connrefused001');

    expect(result.status).toBe(503);
    expect(result.body).toBe('Service temporarily unavailable');

    // WHTEST-06: structured log must contain paymentId + tenantId
    const errorLog = result.logs.map(l => JSON.parse(l)).find(l => l.level === 'error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.paymentId).toBe('tr_connrefused001');
    expect(errorLog?.tenantId).toBeDefined();
  });

  it('WHTEST-03: processes payment only once — second call returns Already processed with zero additional Sanity patches', async () => {
    const { writeClient } = await import('../../sanity/lib/client');
    const mockPatch = vi.mocked(writeClient.patch);

    // First call: payment not yet processed (exists() → 0)
    mockExists.mockResolvedValueOnce(0);
    const first = await processWebhook('tr_idem001');
    expect(first.status).toBe(200);

    // Second call: payment already processed (exists() → 1)
    mockExists.mockResolvedValueOnce(1);
    const second = await processWebhook('tr_idem001');

    expect(second.status).toBe(200);
    expect(second.body).toBe('Already processed');

    // Assert: Sanity patch was called exactly once (from first call only)
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });
});
