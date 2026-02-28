import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';
import { writeClient } from '../../../../sanity/lib/client';
import { formatLog } from '../../../lib/logic/logger';

export const prerender = false;

interface FailedPaymentData {
  paymentId: string;
  projectId: string;
  projectName: string;
  amountCents: number;
  failedAt: string;
  error: string;
}

export const POST: APIRoute = async ({ request }) => {
  // ── Auth: CRON_SECRET header ──
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'Reprocess service not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vercelSig = request.headers.get('x-vercel-cron-signature');
  const isProduction = import.meta.env.PROD;
  // In production: alleen Vercel cron signature accepteren
  // In dev: ook custom header voor lokale tests
  const authorized = isProduction
    ? vercelSig === cronSecret
    : (vercelSig === cronSecret || request.headers.get('x-cron-secret') === cronSecret);

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Redis client ──
  const url = import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return new Response(JSON.stringify({ error: 'Redis not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const r = new Redis({ url, token });

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // ── SCAN for all failed payment keys ──
    let cursor = 0;
    const failedKeys: string[] = [];

    do {
      const [nextCursor, keys] = await r.scan(cursor, { match: '*:failed:*', count: 100 });
      cursor = Number(nextCursor);
      failedKeys.push(...keys);
    } while (cursor !== 0);

    console.log(formatLog('info', 'reprocess_start', { totalKeys: failedKeys.length }));

    // ── Process each failed key ──
    for (const key of failedKeys) {
      const raw = await r.get<string>(key);
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
        // Attempt Sanity write
        await writeClient
          .patch(data.projectId)
          .inc({ huidigBedragCents: data.amountCents })
          .commit();

        // Success: delete failed key, set processed marker
        const [tenantId] = key.split(':failed:');
        await r.del(key);
        await r.set(`${tenantId}:reprocessed:${data.paymentId}`, Date.now(), { ex: 604800 }); // 7 days

        console.log(formatLog('info', 'reprocess_success', {
          paymentId: data.paymentId,
          projectId: data.projectId,
          amountCents: data.amountCents,
        }));

        processed++;
      } catch (sanityErr) {
        const errMsg = sanityErr instanceof Error ? sanityErr.message : String(sanityErr);

        console.error(formatLog('error', 'reprocess_failed', {
          paymentId: data.paymentId,
          projectId: data.projectId,
        }, sanityErr));

        errors.push(`${data.paymentId}: ${errMsg}`);
        failed++;
      }
    }

    console.log(formatLog('info', 'reprocess_complete', { processed, failed }));

    return new Response(JSON.stringify({ processed, failed, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(formatLog('error', 'reprocess_failed', {}, err));
    return new Response(JSON.stringify({ error: 'Reprocess failed', processed, failed, errors }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
