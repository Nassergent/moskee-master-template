import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { fetchSettings } from '../../lib/sanity';
import { checkRateLimit, getClientIp, checkOrigin, isBot } from '../../lib/security';
import { validatePaymentAmount } from '../../lib/logic/payment-validators';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, { status: 302, headers: { Location: '/doneren' } });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const host = request.headers.get('host');
    const siteOrigin = host
      ? `https://${host}`
      : import.meta.env.PUBLIC_SITE_URL || url.origin;

    // CSRF origin check
    const originError = checkOrigin(request, siteOrigin);
    if (originError) return originError;

    // Rate limiting: max 5 donaties per IP per minuut
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 5, 60_000))) {
      return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het over een minuut opnieuw.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Honeypot check
    if (isBot(data)) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { amount, frequency, project, email } = data;

    // Validate via logic compartiment
    const validation = validatePaymentAmount(amount);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const numAmount = validation.amount!;

    const mollieKey = import.meta.env.MOLLIE_API_KEY;
    if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
      const bedanktParams = new URLSearchParams({
        bedrag: numAmount.toFixed(2),
        bestemming: project || 'Algemene Sadaqa',
        demo: 'true',
      });
      return new Response(JSON.stringify({
        success: true,
        redirectUrl: `${siteOrigin}/bedankt?${bedanktParams.toString()}`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch via centralized Sanity layer
    const settings = await fetchSettings();
    const mosqueName = settings?.mosqueName || 'Moskee';

    const mollieClient = createMollieClient({ apiKey: mollieKey });

    const description = project
      ? `Donatie: ${project} — ${mosqueName}`
      : `${frequency === 'maandelijks' ? 'Maandelijkse d' : 'D'}onatie — ${mosqueName}`;

    const isTestKey = mollieKey.startsWith('test_');

    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: numAmount.toFixed(2),
      },
      description,
      redirectUrl: `${siteOrigin}/bedankt?bedrag=${numAmount.toFixed(2)}&bestemming=${encodeURIComponent(project || 'Algemene Sadaqa')}`,
      ...(isTestKey ? {} : { webhookUrl: `${siteOrigin}/api/mollie-webhook` }),
      metadata: {
        frequency,
        project: project || 'Algemeen',
        email: email || '',
      },
    });

    return new Response(JSON.stringify({
      success: true,
      redirectUrl: payment.getCheckoutUrl(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mollie payment error:', error);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden bij het aanmaken van de betaling.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
