import { defineMiddleware } from 'astro:middleware';
import { validateRedisConfig } from './lib/security';
import { formatLog } from './lib/logic/logger';

// Boot-time Redis check — runs once on first request
let bootLogged = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // One-time boot log
  if (!bootLogged) {
    bootLogged = true;
    const redis = validateRedisConfig();
    const isProd = import.meta.env.PROD;
    if (!redis.configured && isProd) {
      console.error(formatLog('error', 'redis_boot_check', { source: 'memory', env: 'production' }));
    } else if (!redis.configured) {
      console.log(formatLog('info', 'redis_boot_check', { source: 'memory', env: 'development' }));
    } else {
      console.log(formatLog('info', 'redis_boot_check', { source: 'redis' }));
    }
  }

  const url = new URL(context.request.url);
  const response = await next();

  // Sanity Studio (/admin) heeft eigen CSP nodig — niet beperken
  if (!url.pathname.startsWith('/admin')) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.mollie.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://cdn.sanity.io https://*.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com",
        "frame-src 'self' https://www.google.com/maps https://maps.google.com https://js.mollie.com",
        "connect-src 'self' https://cdn.sanity.io https://*.api.sanity.io https://api.mollie.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; ')
    );
  }

  // Pagina's met real-time donatie data: nooit cachen
  const noCachePaths = ['/doneren', '/projecten', '/bedankt'];
  if (noCachePaths.some((path) => url.pathname.startsWith(path))) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
});
