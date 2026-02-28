/**
 * Centralized environment helpers.
 * Single source of truth for demo/test mode detection.
 */

/** True when running without real Mollie credentials */
export function isMollieDemoMode(): boolean {
  const key = import.meta.env.MOLLIE_API_KEY;
  return !key || key === 'test_xxxxxxxxxxxx';
}

/** True when running without real Resend credentials */
export function isResendDemoMode(): boolean {
  const key = import.meta.env.RESEND_API_KEY;
  return !key || key === 're_xxxxxxxxxxxx';
}

/** True when HMAC verification should be skipped (dev only) */
export function shouldSkipWebhookVerification(): boolean {
  return import.meta.env.WEBHOOK_SKIP_VERIFICATION === 'true';
}

/** General demo mode — any service is in demo */
export function isDemoMode(): boolean {
  return isMollieDemoMode() || import.meta.env.DEMO_MODE === 'true';
}
