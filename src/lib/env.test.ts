/**
 * env.test.ts — Demo Mode Detection Tests
 *
 * Coverage:
 * DEMO-01: isMollieDemoMode() — returns true when key missing
 * DEMO-02: isMollieDemoMode() — returns true for placeholder key
 * DEMO-03: isMollieDemoMode() — returns false for real key
 * DEMO-04: isResendDemoMode() — returns true when key missing
 * DEMO-05: isResendDemoMode() — returns true for placeholder key
 * DEMO-06: isResendDemoMode() — returns false for real key
 * DEMO-07: isDemoMode() — true when Mollie is demo
 * DEMO-08: isDemoMode() — true when DEMO_MODE env is 'true'
 * DEMO-09: isDemoMode() — false when all services configured
 * DEMO-10: shouldSkipWebhookVerification() — respects env flag
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isMollieDemoMode, isResendDemoMode, isDemoMode, shouldSkipWebhookVerification } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isMollieDemoMode()', () => {
  it('DEMO-01: returns true when MOLLIE_API_KEY is missing', () => {
    vi.stubEnv('MOLLIE_API_KEY', '');
    expect(isMollieDemoMode()).toBe(true);
  });

  it('DEMO-02: returns true for placeholder key test_xxxxxxxxxxxx', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_xxxxxxxxxxxx');
    expect(isMollieDemoMode()).toBe(true);
  });

  it('DEMO-03: returns false for real Mollie key', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'live_abc123def456');
    expect(isMollieDemoMode()).toBe(false);
  });
});

describe('isResendDemoMode()', () => {
  it('DEMO-04: returns true when RESEND_API_KEY is missing', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(isResendDemoMode()).toBe(true);
  });

  it('DEMO-05: returns true for placeholder key re_xxxxxxxxxxxx', () => {
    vi.stubEnv('RESEND_API_KEY', 're_xxxxxxxxxxxx');
    expect(isResendDemoMode()).toBe(true);
  });

  it('DEMO-06: returns false for real Resend key', () => {
    vi.stubEnv('RESEND_API_KEY', 're_real123abc');
    expect(isResendDemoMode()).toBe(false);
  });
});

describe('isDemoMode()', () => {
  it('DEMO-07: returns true when Mollie is in demo mode', () => {
    vi.stubEnv('MOLLIE_API_KEY', '');
    vi.stubEnv('DEMO_MODE', '');
    expect(isDemoMode()).toBe(true);
  });

  it('DEMO-08: returns true when DEMO_MODE env is explicitly true', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'live_realkey');
    vi.stubEnv('DEMO_MODE', 'true');
    expect(isDemoMode()).toBe(true);
  });

  it('DEMO-09: returns false when Mollie configured and DEMO_MODE not set', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'live_realkey');
    vi.stubEnv('DEMO_MODE', '');
    expect(isDemoMode()).toBe(false);
  });
});

describe('shouldSkipWebhookVerification()', () => {
  it('DEMO-10a: returns true when WEBHOOK_SKIP_VERIFICATION is true', () => {
    vi.stubEnv('WEBHOOK_SKIP_VERIFICATION', 'true');
    expect(shouldSkipWebhookVerification()).toBe(true);
  });

  it('DEMO-10b: returns false when WEBHOOK_SKIP_VERIFICATION is not set', () => {
    vi.stubEnv('WEBHOOK_SKIP_VERIFICATION', '');
    expect(shouldSkipWebhookVerification()).toBe(false);
  });
});
