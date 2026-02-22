import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { checkRateLimit, getClientIp, claimPayment } from '../../lib/security';
import { processSuccessfulPayment } from '../../services/payment-service';

export const prerender = false;

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

    // Parse request — Mollie kan form-urlencoded OF JSON sturen
    const contentType = request.headers.get('content-type') || '';
    let paymentId: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      paymentId = body.id;
    } else {
      const formData = await request.formData();
      paymentId = formData.get('id') as string;
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
