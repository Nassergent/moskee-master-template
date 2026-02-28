// ── API Security Utilities ──
// Upstash Redis rate limiting (werkt op Vercel Serverless)
// Fallback naar in-memory als geen Upstash credentials

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter: Upstash Redis als beschikbaar, anders in-memory fallback
let ratelimit: Ratelimit | null = null;
let redis: Redis | null = null;

try {
  const redisUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: false,
      timeout: 500, // ms — caps Redis latency per RATE-05
    });
  }
} catch {
  // Silently fall back to in-memory
}

// In-memory fallback (voor local development)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export type FailStrategy = 'hard-fail' | 'in-memory-fallback';

export interface RateLimitResult {
  allowed: boolean;
  source: 'redis' | 'memory' | 'hard-fail';
}

/**
 * In-memory rate limiting fallback.
 * Used when Redis is unavailable (strategy = in-memory-fallback) or no Redis configured.
 */
function checkInMemoryFallback(
  ip: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, source: 'memory' };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, source: 'memory' };
  }

  entry.count++;
  return { allowed: true, source: 'memory' };
}

/**
 * Rate limiter: Upstash Redis in productie, in-memory lokaal.
 * failStrategy bepaalt gedrag wanneer Redis onbereikbaar is:
 *   - 'hard-fail': geeft { allowed: false, source: 'hard-fail' } → caller retourneert HTTP 503
 *   - 'in-memory-fallback': valt terug op in-memory rate limiting → geen 503
 */
export async function checkRateLimit(
  ip: string,
  failStrategy: FailStrategy,
  maxRequests: number = 5,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  // Upstash Redis (productie)
  if (ratelimit) {
    let response: Awaited<ReturnType<typeof ratelimit.limit>>;
    try {
      response = await ratelimit.limit(ip);
    } catch {
      // Redis threw (connection refused or similar) — apply fail strategy
      if (failStrategy === 'hard-fail') {
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, maxRequests, windowMs);
    }

    if (response.reason === 'timeout') {
      // Redis did not respond within timeout — library allowed by default, we override
      if (failStrategy === 'hard-fail') {
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, maxRequests, windowMs);
    }

    return { allowed: response.success, source: 'redis' };
  }

  // No Redis configured (local dev / missing env) — in-memory only
  return checkInMemoryFallback(ip, maxRequests, windowMs);
}

/**
 * Haal het client IP op uit het request (Vercel/Cloudflare headers)
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Valideer e-mailadres (RFC 5322 simplified).
 * Weigert ongeldige patronen: dubbele @, ontbrekende local part, opeenvolgende punten.
 */
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email);
}

/**
 * Sanitize string: trim + max lengte
 */
export function sanitize(value: string | undefined | null, maxLength: number = 500): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/**
 * Check honeypot veld — als ingevuld is het een bot
 */
export function isBot(data: Record<string, any>): boolean {
  return !!(data.website || data.url || data._gotcha);
}

/**
 * CSRF origin check — valideert dat het request van onze eigen site komt.
 * Retourneert een error Response als de origin niet matcht, of null als alles OK is.
 */
export function checkOrigin(request: Request, siteUrl: string): Response | null {
  const origin = request.headers.get('origin');

  if (!origin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use Host header as primary check (works on any deployment URL)
  const host = request.headers.get('host');
  const originHost = new URL(origin).host;

  if (host && originHost === host) {
    return null; // Same host — allowed
  }

  // Fallback: check against site config
  const allowed = new URL(siteUrl).origin;
  if (origin === allowed) {
    return null;
  }

  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Escape HTML entities om XSS in e-mails te voorkomen.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
