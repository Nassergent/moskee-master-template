import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot, checkOrigin } from '../../lib/security';
import { sanitizeTakenArray } from '../../lib/logic/volunteer-validators';
import { createVolunteer } from '../../services/volunteer-service';
import { sendVolunteerEmails } from '../../services/email-service';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, { status: 302, headers: { Location: '/' } });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const host = request.headers.get('host');
    const siteOrigin = host ? `https://${host}` : import.meta.env.PUBLIC_SITE_URL || url.origin;

    // CSRF origin check
    const originError = checkOrigin(request, siteOrigin);
    if (originError) return originError;

    // Rate limiting: max 3 aanmeldingen per IP per minuut
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 3, 60_000))) {
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

    // Input validatie & sanitization
    const naam = sanitize(data.naam, 100);
    const email = sanitize(data.email, 200);
    const telefoon = sanitize(data.telefoon, 20);
    const bericht = sanitize(data.bericht, 1000);
    const taken = sanitizeTakenArray(data.taken);

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

    // Sla vrijwilliger op in Sanity
    await createVolunteer({ naam, email, telefoon, taken, bericht });

    // Delegate email sending to service
    try {
      await sendVolunteerEmails({ naam, email, telefoon, taken, bericht });
    } catch (emailErr) {
      console.error('Vrijwilliger e-mail fout:', emailErr);
    }

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
