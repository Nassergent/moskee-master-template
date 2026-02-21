import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { sanityClient } from '../../lib/sanity';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const { amount, frequency, project, email } = await request.json();

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

    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: numAmount.toFixed(2),
      },
      description,
      redirectUrl: `${url.origin}/bedankt?bedrag=${numAmount.toFixed(2)}&bestemming=${encodeURIComponent(project || 'Algemene Sadaqa')}`,
      webhookUrl: `${url.origin}/api/mollie-webhook`,
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
