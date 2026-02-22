import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { sanityClient } from '../../lib/sanity';
import { checkRateLimit, getClientIp, checkOrigin, isBot } from '../../lib/security';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, { status: 302, headers: { Location: '/doneren' } });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    // CSRF origin check
    const originError = checkOrigin(request, url.origin);
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

    // Validatie
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1 || numAmount > 10000) {
      return new Response(JSON.stringify({ error: 'Ongeldig bedrag (min €1, max €10.000).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mollieKey = import.meta.env.MOLLIE_API_KEY;
    if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
      // Graceful fallback: log de donatie maar redirect naar bedankt
      // Geen Mollie key — graceful fallback naar bedankt-pagina
      const bedanktParams = new URLSearchParams({
        bedrag: numAmount.toFixed(2),
        bestemming: project || 'Algemene Sadaqa',
        demo: 'true',
      });
      return new Response(JSON.stringify({
        success: true,
        redirectUrl: `${url.origin}/bedankt?${bedanktParams.toString()}`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Haal moskeenaam op voor beschrijving
    const settings = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName }`);
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
      redirectUrl: `${url.origin}/bedankt?bedrag=${numAmount.toFixed(2)}&bestemming=${encodeURIComponent(project || 'Algemene Sadaqa')}`,
      // Skip webhook in test mode (Mollie validates reachability)
      ...(isTestKey ? {} : { webhookUrl: `${url.origin}/api/mollie-webhook` }),
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
