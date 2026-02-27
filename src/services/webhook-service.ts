/**
 * Webhook Service — armored payment processing flow.
 * Idempotent, concurrency-safe, retry-safe, recovery-ready.
 */

import { createMollieClient } from '@mollie/api-client';
import { Redis } from '@upstash/redis';
import { writeClient } from '../../sanity/lib/client';
import { fetchProjectById, fetchProjectByTitle } from '../lib/sanity';
import { isValidPaymentId, stringToCents, parseWebhookMetadata } from '../lib/logic/webhook-validators';
import { shouldUpdateProject } from '../lib/logic/payment-validators';
import { formatLog } from '../lib/logic/logger';
import type { LogContext } from '../lib/logic/logger';
import { processSuccessfulPayment } from './payment-service';

// ── Types ──

export interface WebhookResult {
  status: number;
  body: string;
  logs: string[];
}

// ── Redis client (lazy init) ──

let redis: Redis | null = null;
let redisChecked = false;

function getRedis(): Redis | null {
  if (redisChecked) return redis;
  redisChecked = true;

  const url = import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

// ── Core Flow ──

/**
 * Process a Mollie webhook call. This is the armored flow:
 * 1. Check if already processed (idempotency)
 * 2. Acquire processing lock (concurrency)
 * 3. Fetch payment from Mollie
 * 4. Validate + commit to Sanity (with retry)
 * 5. Mark processed + release lock
 */
export async function processWebhook(paymentId: string): Promise<WebhookResult> {
  const logs: string[] = [];
  const startTime = Date.now();

  const log = (level: 'info' | 'warn' | 'error', event: any, ctx: LogContext = {}, error?: unknown) => {
    const line = formatLog(level, event, { paymentId, ...ctx }, error);
    logs.push(line);
  };

  log('info', 'webhook_received', {});

  const mollieKey = import.meta.env.MOLLIE_API_KEY;
  if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
    log('info', 'webhook_complete', { duration_ms: Date.now() - startTime, note: 'demo_mode' });
    return { status: 200, body: 'OK (demo)', logs };
  }

  const r = getRedis();
  const tenantId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'default';

  // ── Redis is VERPLICHT in productie ──
  // Zonder Redis geen idempotency → risico op dubbele betalingen.
  // Op Vercel serverless werkt in-memory fallback niet (elke invocation = nieuw geheugen).
  // Strategie: weiger webhook gracefully, Mollie herprobeert automatisch.
  if (!r) {
    log('error', 'webhook_error', { tenantId, step: 'redis_required' });
    return { status: 503, body: 'Service temporarily unavailable', logs };
  }

  // ── Step B: Idempotency check ──
  try {
    const exists = await r.exists(`${tenantId}:processed:${paymentId}`);
    if (exists) {
      log('info', 'already_processed', { tenantId });
      return { status: 200, body: 'Already processed', logs };
    }
  } catch (redisErr) {
    // Redis tijdelijk onbereikbaar → 503, Mollie herprobeert
    log('error', 'webhook_error', { tenantId, step: 'idempotency_check' }, redisErr);
    return { status: 503, body: 'Service temporarily unavailable', logs };
  }

  // ── Step C: Processing lock ──
  try {
    const lockKey = `${tenantId}:processing:${paymentId}`;
    const locked = await r.set(lockKey, Date.now(), { nx: true, ex: 300 });
    if (!locked) {
      log('info', 'lock_exists', { tenantId });
      return { status: 200, body: 'Already processing', logs };
    }
    log('info', 'lock_acquired', { tenantId });
  } catch (redisErr) {
    log('error', 'webhook_error', { tenantId, step: 'lock_acquire' }, redisErr);
    return { status: 503, body: 'Service temporarily unavailable', logs };
  }

  try {
    // ── Step D: Fetch Mollie payment ──
    const mollieClient = createMollieClient({ apiKey: mollieKey });
    let payment: any;

    try {
      payment = await mollieClient.payments.get(paymentId);
    } catch (mollieErr: any) {
      const statusCode = mollieErr?.statusCode || mollieErr?.status;
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        // 4xx = client error, don't retry
        log('warn', 'webhook_error', { tenantId, step: 'mollie_fetch', mollieStatus: statusCode }, mollieErr);
        await releaseLock(r, tenantId, paymentId);
        return { status: 200, body: 'Mollie 4xx', logs };
      }
      // 5xx or network = let Mollie retry
      log('error', 'webhook_error', { tenantId, step: 'mollie_fetch' }, mollieErr);
      await releaseLock(r, tenantId, paymentId);
      return { status: 500, body: 'Mollie fetch failed', logs };
    }

    log('info', 'mollie_fetched', { tenantId, mollieStatus: payment.status });

    if (payment.status !== 'paid') {
      log('info', 'payment_not_paid', { tenantId, mollieStatus: payment.status });
      await releaseLock(r, tenantId, paymentId);
      return { status: 200, body: 'Not paid', logs };
    }

    // ── Parse metadata ──
    const rawMeta = payment.metadata as Record<string, unknown> | null;
    const meta = parseWebhookMetadata(rawMeta);

    // Sanitize metadata for logging (strip PII)
    const safeMeta = rawMeta ? { ...rawMeta, email: rawMeta.email ? '[REDACTED]' : undefined } : null;

    log('info', 'mollie_fetched', {
      tenantId,
      rawAmount: payment.amount?.value,
      rawCurrency: payment.amount?.currency,
      rawMetadata: JSON.stringify(safeMeta),
    });

    const amountCents = stringToCents(payment.amount.value);

    // ── Sanity commit with retry ──
    let projectId = meta?.projectId;
    let projectName = meta?.projectName || (rawMeta?.project as string) || 'Algemeen';

    // Legacy fallback: if no projectId, look up by title
    if (!projectId && rawMeta?.project && typeof rawMeta.project === 'string') {
      const legacyProject = rawMeta.project as string;
      if (shouldUpdateProject(legacyProject)) {
        const found = await fetchProjectByTitle(legacyProject);
        if (found?._id) {
          projectId = found._id;
          projectName = legacyProject;
        }
      }
    }

    if (projectId && shouldUpdateProject(projectName)) {
      await retryWithBackoff(async (attempt) => {
        if (attempt > 1) {
          log('info', 'sanity_commit_retry', { tenantId, projectId: projectId!, amountCents, attempt });
        }
        const result = await writeClient
          .patch(projectId!)
          .inc({ huidigBedragCents: amountCents })
          .commit();
        log('info', 'sanity_commit_ok', {
          tenantId,
          projectId: projectId!,
          amountCents,
          newTotalCents: result?.huidigBedragCents,
        });
      }, 3, logs, paymentId, tenantId);
    } else {
      log('info', 'payment_not_paid', { tenantId, note: 'no_project_update', projectId, projectName });
    }

    // ── Step F: Mark processed IMMEDIATELY after Sanity commit ──
    // CRITICAL: Must happen before email dispatch to prevent double-increment on crash
    if (r) {
      try {
        await r.set(`${tenantId}:processed:${paymentId}`, Date.now(), { ex: 604800 }); // 7 days TTL
        await r.del(`${tenantId}:processing:${paymentId}`);
        log('info', 'processed_set', { tenantId });
      } catch (redisErr) {
        log('warn', 'webhook_error', { tenantId, step: 'mark_processed' }, redisErr);
      }
    }

    // ── Email dispatch (after processed marker, with retry) ──
    const emailPayload = {
      amount: payment.amount,
      metadata: {
        project: projectName,
        frequency: meta?.frequency || (rawMeta?.frequency as string),
        email: meta?.email || (rawMeta?.email as string),
      },
      skipSanityUpdate: true,  // We already updated Sanity above
    };

    let emailSent = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await processSuccessfulPayment(emailPayload);
        log('info', 'email_sent', { tenantId, attempt });
        emailSent = true;
        break;
      } catch (emailErr) {
        log('warn', 'webhook_error', { tenantId, step: 'email', attempt }, emailErr);
        if (attempt < 3) await sleep(attempt * 500);
      }
    }
    if (!emailSent) {
      log('error', 'webhook_error', { tenantId, step: 'email_failed_all_retries' });
    }

    log('info', 'webhook_complete', { tenantId, duration_ms: Date.now() - startTime });
    return { status: 200, body: 'OK', logs };

  } catch (err) {
    // ── Unexpected error: release lock, return 500 ──
    log('error', 'webhook_error', { tenantId, step: 'unexpected', duration_ms: Date.now() - startTime }, err);
    await releaseLock(r, tenantId, paymentId);
    return { status: 500, body: 'Webhook error', logs };
  }
}

// ── Helpers ──

async function releaseLock(r: Redis | null, tenantId: string, paymentId: string): Promise<void> {
  if (!r) return;
  try {
    await r.del(`${tenantId}:processing:${paymentId}`);
  } catch {
    // Best effort
  }
}

/**
 * Retry a function with exponential backoff.
 * Only retries on 5xx-like errors (network, timeouts).
 * Max 3 attempts, backoff: 100ms → 300ms → 900ms.
 */
async function retryWithBackoff(
  fn: (attempt: number) => Promise<void>,
  maxAttempts: number,
  logs: string[],
  paymentId: string,
  tenantId: string
): Promise<void> {
  const backoffs = [100, 300, 900];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn(attempt);
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        logs.push(formatLog('error', 'sanity_commit_failed', {
          paymentId,
          tenantId,
          attempt,
        }, err));
        throw err;
      }

      logs.push(formatLog('warn', 'sanity_commit_retry', {
        paymentId,
        tenantId,
        attempt,
        nextRetryMs: backoffs[attempt - 1],
      }, err));

      await sleep(backoffs[attempt - 1]);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
