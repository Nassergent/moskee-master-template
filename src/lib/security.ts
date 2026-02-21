// ── API Security Utilities ──

// In-memory rate limiter (per Vercel function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Eenvoudige rate limiter: max X requests per IP per tijdsvenster.
 * Returns true als het request is toegestaan, false als gelimiteerd.
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const key = ip;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
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
  // Controleer of het honeypot veld is ingevuld
  return !!(data.website || data.url || data._gotcha);
}
