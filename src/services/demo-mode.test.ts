/**
 * demo-mode.test.ts — Demo Mode Guard Integration Tests
 *
 * Verifies that all service entry points correctly short-circuit when
 * running without real API credentials (demo mode).
 *
 * Coverage:
 * DEMO-SVC-01: webhook-service returns 'OK (demo)' when Mollie key missing
 * DEMO-SVC-02: webhook-service returns 'OK (demo)' for placeholder key
 * DEMO-SVC-03: email-service sendContactNotification() returns early in demo
 * DEMO-SVC-04: email-service sendVolunteerEmails() returns early in demo
 * DEMO-SVC-05: email-service sendEventRegistrationEmails() returns early in demo
 * DEMO-SVC-06: payment-service skips email when Resend is demo
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock all external dependencies ──

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () {
    return { exists: vi.fn(), set: vi.fn(), del: vi.fn() };
  }),
}));

vi.mock('@mollie/api-client', () => ({
  createMollieClient: vi.fn(() => ({
    payments: { get: vi.fn() },
  })),
}));

vi.mock('../../sanity/lib/client', () => ({
  writeClient: {
    patch: vi.fn(() => ({
      inc: vi.fn(() => ({
        commit: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

vi.mock('../lib/sanity', () => ({
  fetchSettings: vi.fn().mockResolvedValue({
    mosqueName: 'Test Moskee',
    email: 'test@moskee.be',
    primaryTheme: 'slate-indigo',
  }),
  fetchProjectById: vi.fn().mockResolvedValue(null),
  fetchProjectByTitle: vi.fn().mockResolvedValue(null),
}));

// Mock Resend to track if it gets called
const mockSend = vi.fn().mockResolvedValue({ id: 'email_123' });
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
}));

vi.mock('../lib/email-templates', () => ({
  contactNotificationEmail: vi.fn(() => '<html>contact</html>'),
  volunteerNotificationEmail: vi.fn(() => '<html>vol-notif</html>'),
  volunteerConfirmationEmail: vi.fn(() => '<html>vol-confirm</html>'),
  eventRegistrationNotificationEmail: vi.fn(() => '<html>event-notif</html>'),
  eventRegistrationConfirmationEmail: vi.fn(() => '<html>event-confirm</html>'),
  donationConfirmationEmail: vi.fn(() => '<html>donation</html>'),
}));

vi.mock('./payment-service', () => ({
  processSuccessfulPayment: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { processWebhook } from './webhook-service';
import { sendContactNotification, sendVolunteerEmails, sendEventRegistrationEmails } from './email-service';
import { processSuccessfulPayment } from './payment-service';

beforeEach(() => {
  mockSend.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── Webhook Service Demo Guards ──

describe('Webhook Service — demo mode guards', () => {
  it('DEMO-SVC-01: returns OK (demo) when MOLLIE_API_KEY is missing', async () => {
    vi.stubEnv('MOLLIE_API_KEY', '');

    const result = await processWebhook('tr_demo001');

    expect(result.status).toBe(200);
    expect(result.body).toBe('OK (demo)');
  });

  it('DEMO-SVC-02: returns OK (demo) for placeholder key test_xxxxxxxxxxxx', async () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_xxxxxxxxxxxx');

    const result = await processWebhook('tr_demo002');

    expect(result.status).toBe(200);
    expect(result.body).toBe('OK (demo)');
  });
});

// ── Email Service Demo Guards ──

describe('Email Service — demo mode guards', () => {
  it('DEMO-SVC-03: sendContactNotification() returns without sending when Resend is demo', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await sendContactNotification({
      naam: 'Test',
      email: 'test@example.com',
      bericht: 'Hallo',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('DEMO-SVC-04: sendVolunteerEmails() returns without sending when Resend is demo', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_xxxxxxxxxxxx');

    await sendVolunteerEmails({
      naam: 'Vrijwilliger',
      email: 'vol@example.com',
      taken: ['schoonmaak'],
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('DEMO-SVC-05: sendEventRegistrationEmails() returns without sending when Resend is demo', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await sendEventRegistrationEmails({
      name: 'Deelnemer',
      email: 'event@example.com',
      partySize: 2,
      eventTitle: 'Iftar',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ── Payment Service Demo Guard ──

describe('Payment Service — demo mode guard', () => {
  it('DEMO-SVC-06: processSuccessfulPayment() skips email when Resend is demo', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    // Re-import to get the real function (not the mocked one from webhook test)
    const { processSuccessfulPayment: realProcess } = await vi.importActual<
      typeof import('./payment-service')
    >('./payment-service');

    await realProcess({
      amount: { value: '25.00' },
      metadata: { project: 'Test', email: 'donor@example.com' },
      skipSanityUpdate: true,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
