import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';
import { formatLog } from '../../../lib/logic/logger';
import { reprocessFailedPayments } from '../../../services/reprocess-service';

export const prerender = false;

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

  const redis = new Redis({ url, token });

  try {
    const result = await reprocessFailedPayments(redis);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(formatLog('error', 'reprocess_failed', {}, err));
    return new Response(JSON.stringify({ error: 'Reprocess failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
