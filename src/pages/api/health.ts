import type { APIRoute } from 'astro';
import { validateRedisConfig } from '../../lib/security';
import { fetchSettings } from '../../lib/sanity';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Protect with HEALTH_SECRET header
  const secret = import.meta.env.HEALTH_SECRET;
  if (secret) {
    const provided = request.headers.get('x-health-secret');
    if (provided !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const result: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Redis check
  const redisConfig = validateRedisConfig();
  if (redisConfig.configured) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      result.redis = 'ok';
    } catch {
      result.redis = 'error';
      result.status = 'degraded';
    }
  } else {
    result.redis = 'unconfigured';
  }

  // Sanity check (with timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const settings = await fetchSettings();
    clearTimeout(timeout);
    result.sanity = settings?.mosqueName ? 'ok' : 'empty';
  } catch {
    result.sanity = 'error';
    result.status = 'degraded';
  }

  // Mollie check (env only, no API call)
  const mollieKey = import.meta.env.MOLLIE_API_KEY;
  result.mollie = mollieKey && mollieKey !== 'test_xxxxxxxxxxxx' ? 'configured' : 'unconfigured';

  const statusCode = result.status === 'ok' ? 200 : 503;
  return new Response(JSON.stringify(result), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
};
