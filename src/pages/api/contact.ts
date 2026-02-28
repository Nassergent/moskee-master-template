import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot, checkOrigin } from '../../lib/security';
import { sendContactNotification } from '../../services/email-service';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, { status: 302, headers: { Location: '/contact' } });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const host = request.headers.get('host');
    const siteOrigin = host ? `https://${host}` : import.meta.env.PUBLIC_SITE_URL || url.origin;

    // CSRF origin check
    const originError = checkOrigin(request, siteOrigin);
    if (originError) return originError;

    // Rate limiting: max 3 berichten per IP per minuut — in-memory-fallback wanneer Redis onbereikbaar
    const ip = getClientIp(request);
    const rl = await checkRateLimit(ip, 'in-memory-fallback', 3, 60_000);

    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het over een minuut opnieuw.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let data: any;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Ongeldig verzoek.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Honeypot check
    if (isBot(data)) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Input validatie & sanitization
    const naam = sanitize(data.naam, 100);
    const email = sanitize(data.email, 200);
    const telefoon = sanitize(data.telefoon, 20);
    const onderwerp = sanitize(data.onderwerp, 100);
    const bericht = sanitize(data.bericht, 5000);

    if (!naam || naam.length < 2) {
      return new Response(JSON.stringify({ error: 'Vul een geldige naam in.' }), {
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

    if (!bericht || bericht.length < 10) {
      return new Response(JSON.stringify({ error: 'Vul een bericht in (min. 10 tekens).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delegate to email service
    await sendContactNotification({ naam, email, telefoon, onderwerp, bericht });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
