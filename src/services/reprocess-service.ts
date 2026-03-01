/**
 * Reprocess Service — retry failed payment writes to Sanity.
 * Scans Redis for failed payment keys and retries Sanity mutations.
 * No env vars: receives Redis instance from caller.
 */
import type { Redis } from '@upstash/redis';
import { writeClient } from '../../sanity/lib/client';
import { formatLog } from '../lib/logic/logger';

interface FailedPaymentData {
  paymentId: string;
  projectId: string;
  projectName: string;
  amountCents: number;
  failedAt: string;
  error: string;
}

export interface ReprocessResult {
  processed: number;
  failed: number;
  errors: string[];
}

/** Scan Redis for failed payment keys and retry Sanity writes. */
export async function reprocessFailedPayments(redis: Redis): Promise<ReprocessResult> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  // SCAN for all failed payment keys
  let cursor = 0;
  const failedKeys: string[] = [];

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: '*:failed:*', count: 100 });
    cursor = Number(nextCursor);
    failedKeys.push(...keys);
  } while (cursor !== 0);

  console.log(formatLog('info', 'reprocess_start', { totalKeys: failedKeys.length }));

  // Process each failed key
  for (const key of failedKeys) {
    const raw = await redis.get<string>(key);
    if (!raw) continue;

    let data: FailedPaymentData;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : (raw as FailedPaymentData);
    } catch {
      errors.push(`Invalid JSON at key ${key}`);
      failed++;
      continue;
    }

    try {
      await writeClient
        .patch(data.projectId)
        .inc({ huidigBedragCents: data.amountCents })
        .commit();

      // Success: delete failed key, set processed marker (7 days TTL)
      const [tenantId] = key.split(':failed:');
      await redis.del(key);
      await redis.set(`${tenantId}:reprocessed:${data.paymentId}`, Date.now(), { ex: 604800 });

      console.log(formatLog('info', 'reprocess_success', {
        paymentId: data.paymentId,
        projectId: data.projectId,
        amountCents: data.amountCents,
      }));

      processed++;
    } catch (sanityErr) {
      console.error(formatLog('error', 'reprocess_failed', {
        paymentId: data.paymentId,
        projectId: data.projectId,
      }, sanityErr));

      const errMsg = sanityErr instanceof Error ? sanityErr.message : String(sanityErr);
      errors.push(`${data.paymentId}: ${errMsg}`);
      failed++;
    }
  }

  console.log(formatLog('info', 'reprocess_complete', { processed, failed }));
  return { processed, failed, errors };
}
