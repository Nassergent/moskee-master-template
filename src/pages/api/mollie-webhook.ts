import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp } from '../../lib/security';
import { verifyHmacTimingSafe, isValidPaymentId } from '../../lib/logic/webhook-validators';
import { processWebhook } from '../../services/webhook-service';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response('Webhook endpoint', { status: 405 });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting: max 20 req/min per IP — in-memory-fallback wanneer Redis onbereikbaar
    const ip = getClientIp(request);
    const rl = await checkRateLimit(ip, 'in-memory-fallback', 20, 60_000, '/api/mollie-webhook');

    if (!rl.allowed) {
      return new Response('Rate limited', { status: 429 });
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // ── HMAC Verification ──
    const mollieKey = import.meta.env.MOLLIE_API_KEY || '';
    const secret = import.meta.env.MOLLIE_WEBHOOK_SECRET;
    const signature = request.headers.get('x-mollie-signature');

    if (mollieKey.startsWith('test_')) {
      // Test mode: Mollie sends no signature → skip
      console.warn('[webhook] HMAC verification skipped (test mode)');
    } else {
      // Live mode: signature verification is mandatory
      if (!secret) {
        throw new Error('MOLLIE_WEBHOOK_SECRET is required in production');
      }
      if (!signature || !(await verifyHmacTimingSafe(secret, rawBody, signature))) {
        console.warn('[webhook] Invalid signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    // ── Parse payment ID ──
    const contentType = request.headers.get('content-type') || '';
    let paymentId: string;

    if (contentType.includes('application/json')) {
      paymentId = JSON.parse(rawBody).id;
    } else {
      const params = new URLSearchParams(rawBody);
      paymentId = params.get('id') || '';
    }

    if (!isValidPaymentId(paymentId)) {
      return new Response('Invalid payment ID', { status: 400 });
    }

    // ── Delegate to webhook service ──
    const result = await processWebhook(paymentId);

    // Output structured logs (always, even on error)
    for (const line of result.logs) {
      if (result.status >= 400) {
        console.error(line);
      } else {
        console.log(line);
      }
    }

    return new Response(result.body, { status: result.status });
  } catch (error) {
    console.error('[webhook] Unhandled error:', error instanceof Error ? error.stack : error);
    return new Response('Webhook error', { status: 500 });
  }
};
