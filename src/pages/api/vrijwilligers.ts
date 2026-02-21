import type { APIRoute } from 'astro';
import { writeClient } from '../../lib/sanity';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot } from '../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting: max 3 aanmeldingen per IP per minuut
    const ip = getClientIp(request);
    if (!checkRateLimit(ip, 3, 60_000)) {
      return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het over een minuut opnieuw.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Honeypot check
    if (isBot(data)) {
      // Stille afwijzing — bot denkt dat het gelukt is
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Input validatie & sanitization
    const naam = sanitize(data.naam, 100);
    const email = sanitize(data.email, 200);
    const telefoon = sanitize(data.telefoon, 20);
    const bericht = sanitize(data.bericht, 1000);
    const taken = Array.isArray(data.taken)
      ? data.taken.filter((t: string) => typeof t === 'string').slice(0, 10).map((t: string) => sanitize(t, 50))
      : [];

    if (!naam || naam.length < 2) {
      return new Response(JSON.stringify({ error: 'Vul een geldige naam in (min. 2 tekens).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Vul een geldig e-mailadres in.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await writeClient.create({
      _type: 'volunteer',
      naam,
      email,
      telefoon,
      taken,
      bericht,
      aanmeldDatum: new Date().toISOString(),
      status: 'nieuw',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vrijwilligers API error:', error);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
