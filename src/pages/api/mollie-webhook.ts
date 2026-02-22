import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { checkRateLimit, getClientIp, claimPayment } from '../../lib/security';
import { processSuccessfulPayment } from '../../services/payment-service';

export const prerender = false;

/**
 * Verify Mollie webhook signature (HMAC-SHA256).
 * Returns true if verification passes or if no secret is configured (dev mode).
 */
async function verifyMollieSignature(request: Request, body: string): Promise<boolean> {
  const secret = import.meta.env.MOLLIE_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev when no secret configured

  const signature = request.headers.get('x-mollie-signature');
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signed)));

  return signature === computed;
}

export const GET: APIRoute = async () => {
  return new Response('Webhook endpoint', { status: 405 });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 20, 60_000))) {
      return new Response('Rate limited', { status: 429 });
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Mollie HMAC-SHA256 signature
    if (!(await verifyMollieSignature(request, rawBody))) {
      console.warn('Mollie webhook: invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse request — Mollie kan form-urlencoded OF JSON sturen
    const contentType = request.headers.get('content-type') || '';
    let paymentId: string;

    if (contentType.includes('application/json')) {
      paymentId = JSON.parse(rawBody).id;
    } else {
      const params = new URLSearchParams(rawBody);
      paymentId = params.get('id') || '';
    }

    if (!paymentId || typeof paymentId !== 'string' || !paymentId.startsWith('tr_')) {
      return new Response('Invalid payment ID', { status: 400 });
    }

    const mollieKey = import.meta.env.MOLLIE_API_KEY;
    if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
      return new Response('OK', { status: 200 });
    }

    // Idempotency: voorkom dubbele verwerking bij webhook retries
    const isNew = await claimPayment(paymentId);
    if (!isNew) {
      return new Response('OK', { status: 200 });
    }

    // Fetch payment from Mollie
    const mollieClient = createMollieClient({ apiKey: mollieKey });
    const payment = await mollieClient.payments.get(paymentId);

    // Delegate to service
    if (payment.status === 'paid') {
      await processSuccessfulPayment({
        amount: payment.amount,
        metadata: payment.metadata as { project?: string; frequency?: string; email?: string } | null,
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Mollie webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};
