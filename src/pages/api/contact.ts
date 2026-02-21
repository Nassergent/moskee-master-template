import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityClient } from '../../lib/sanity';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot } from '../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting: max 3 berichten per IP per minuut
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

    const apiKey = import.meta.env.RESEND_API_KEY;

    if (apiKey && apiKey !== 're_xxxxxxxxxxxx') {
      const settings = await sanityClient.fetch(`*[_id == "settings"][0].email`);
      const contactEmail = settings || 'info@moskee.be';

      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'Moskee Website <onboarding@resend.dev>',
        to: [contactEmail],
        replyTo: email,
        subject: `Contactformulier: ${onderwerp || 'Algemeen'}`,
        html: `
          <h2>Nieuw bericht via contactformulier</h2>
          <p><strong>Naam:</strong> ${naam}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Telefoon:</strong> ${telefoon || 'Niet opgegeven'}</p>
          <p><strong>Onderwerp:</strong> ${onderwerp || 'Niet opgegeven'}</p>
          <hr />
          <p>${bericht.replace(/\n/g, '<br />')}</p>
        `,
      });
    } else {
      console.log('Contact form submission (no Resend API key):', { naam, email, onderwerp, bericht });
    }

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
