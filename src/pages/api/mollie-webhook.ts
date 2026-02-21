import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId) {
      return new Response('Missing payment ID', { status: 400 });
    }

    const mollieKey = import.meta.env.MOLLIE_API_KEY;
    if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
      return new Response('OK', { status: 200 });
    }

    const mollieClient = createMollieClient({ apiKey: mollieKey });
    const payment = await mollieClient.payments.get(paymentId);

    console.log(`Mollie webhook: Payment ${paymentId} status=${payment.status}, amount=${payment.amount.value} EUR`);

    // Hier kun je extra logica toevoegen:
    // - Donatie opslaan in Sanity
    // - Bevestigingsmail sturen
    // - Project bedrag updaten

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Mollie webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};
