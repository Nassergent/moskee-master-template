/**
 * Structured JSON logger (pure formatter).
 * No console calls — returns formatted strings for the caller to output.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEvent =
  | 'webhook_received'
  | 'lock_acquired'
  | 'lock_exists'
  | 'already_processed'
  | 'mollie_fetched'
  | 'payment_not_paid'
  | 'sanity_commit_ok'
  | 'sanity_commit_retry'
  | 'sanity_commit_failed'
  | 'processed_set'
  | 'email_sent'
  | 'webhook_complete'
  | 'webhook_error'
  | 'reconcile_start'
  | 'reconcile_complete'
  | 'reconcile_diff';

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  projectId?: string;
  paymentId?: string;
  amountCents?: number;
  duration_ms?: number;
  attempt?: number;
  [key: string]: unknown;
}

// Keys that should never appear in logs
const SENSITIVE_KEYS = new Set([
  'secret', 'token', 'apiKey', 'api_key', 'password',
  'MOLLIE_API_KEY', 'MOLLIE_WEBHOOK_SECRET', 'SANITY_WRITE_TOKEN',
  'RESEND_API_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'CRON_SECRET',
]);

/** Strip sensitive values from log context */
export function sanitizeContext(ctx: LogContext): LogContext {
  const clean: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      clean[key] = value.slice(0, 200) + '…';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/** Format a structured JSON log line */
export function formatLog(
  level: LogLevel,
  event: LogEvent,
  context: LogContext = {},
  error?: unknown
): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizeContext(context),
  };

  if (error) {
    entry.error = error instanceof Error
      ? { message: error.message, name: error.name }
      : String(error);
  }

  return JSON.stringify(entry);
}
