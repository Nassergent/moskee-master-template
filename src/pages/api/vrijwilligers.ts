import type { APIRoute } from 'astro';
import { writeClient, sanityClient } from '../../lib/sanity';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot } from '../../lib/security';
import { volunteerNotificationEmail, volunteerConfirmationEmail } from '../../lib/email-templates';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Sla vrijwilliger op in Sanity
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

    // Haal settings op voor e-mails
    const resendKey = import.meta.env.RESEND_API_KEY;
    if (resendKey && resendKey !== 're_xxxxxxxxxxxx') {
      try {
        const settings = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName, email, theme }`);
        const mosqueName = settings?.mosqueName || 'Onze Moskee';
        const mosqueEmail = settings?.email;
        const colors = settings?.theme ? {
          primary: settings.theme.primaryColor,
          accent: settings.theme.accentColor,
          base: settings.theme.baseColor,
        } : undefined;

        const resend = new Resend(resendKey);

        // 1. Notificatie naar de moskee
        if (mosqueEmail) {
          await resend.emails.send({
            from: `${mosqueName} <onboarding@resend.dev>`,
            to: [mosqueEmail],
            replyTo: email,
            subject: `👥 Nieuwe vrijwilliger: ${naam}`,
            html: volunteerNotificationEmail({
              mosqueName,
              mosqueEmail,
              naam,
              email,
              telefoon,
              taken,
              bericht,
              colors,
            }),
          });
        }

        // 2. Bevestiging naar de vrijwilliger
        await resend.emails.send({
          from: `${mosqueName} <onboarding@resend.dev>`,
          to: [email],
          replyTo: mosqueEmail || undefined,
          subject: `Welkom als vrijwilliger bij ${mosqueName}`,
          html: volunteerConfirmationEmail({
            mosqueName,
            mosqueEmail,
            naam,
            taken,
            colors,
          }),
        });
      } catch (emailErr) {
        console.error('Vrijwilliger e-mail fout:', emailErr);
      }
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
