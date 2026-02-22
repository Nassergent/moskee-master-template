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
    });
  }
} catch {
  // Silently fall back to in-memory
}

// In-memory fallback (voor local development)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter: Upstash Redis in productie, in-memory lokaal.
 * Returns true als het request is toegestaan, false als gelimiteerd.
 */
export async function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): Promise<boolean> {
  // Upstash Redis (productie)
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    return success;
  }

  // In-memory fallback (development)
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
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
 * Valideer e-mailadres (basis regex)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  console.log('[CSRF] BLOCKED — origin:', origin, '| host:', host, '| allowed:', allowed);
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Idempotency helpers (webhook deduplication) ──

// Tenant prefix voor multi-tenant Redis isolatie
const tenantId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'default';

const processedPayments = new Map<string, number>();

/**
 * Check of een payment al is verwerkt. Gebruikt Redis (productie) of in-memory (dev).
 * Redis keys zijn tenant-prefixed om cross-tenant collisions te voorkomen.
 * Returns true als het payment NIEUW is en verwerkt mag worden.
 * Returns false als het al verwerkt is (skip).
 */
export async function claimPayment(paymentId: string): Promise<boolean> {
  const key = `${tenantId}:processed:${paymentId}`;

  // Redis: atomic SET NX met 24h TTL
  if (redis) {
    const result = await redis.set(key, Date.now(), { nx: true, ex: 86400 });
    return result !== null;
  }

  // In-memory fallback (dev)
  if (processedPayments.has(paymentId)) return false;
  processedPayments.set(paymentId, Date.now());

  // Cleanup: verwijder entries ouder dan 24 uur
  const cutoff = Date.now() - 86_400_000;
  for (const [id, ts] of processedPayments) {
    if (ts < cutoff) processedPayments.delete(id);
  }

  return true;
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
