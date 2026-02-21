import type { APIRoute } from 'astro';
import { writeClient, sanityClient } from '../../lib/sanity';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot } from '../../lib/security';

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

    // Stuur bevestigingsmail naar de vrijwilliger
    const resendKey = import.meta.env.RESEND_API_KEY;
    if (resendKey && resendKey !== 're_xxxxxxxxxxxx') {
      try {
        const settings = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName, email }`);
        const mosqueName = settings?.mosqueName || 'Onze Moskee';

        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: `${mosqueName} <onboarding@resend.dev>`,
          to: [email],
          replyTo: settings?.email || undefined,
          subject: `Welkom als vrijwilliger bij ${mosqueName}`,
          html: `
            <div style="font-family: 'Lato', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
              <div style="background-color: #1D5C6B; padding: 32px; text-align: center;">
                <h1 style="color: white; font-family: Georgia, serif; margin: 0; font-size: 24px;">
                  Jazak Allahu Khairan
                </h1>
              </div>
              <div style="padding: 32px; background-color: #FBF9F7;">
                <p style="font-size: 16px; line-height: 1.6;">Assalamu Alaikum ${naam},</p>
                <p style="font-size: 16px; line-height: 1.6;">
                  Bedankt voor je aanmelding als vrijwilliger bij <strong>${mosqueName}</strong>.
                  Wij waarderen je inzet enorm en nemen binnenkort contact met je op.
                </p>
                ${taken.length > 0 ? `
                <div style="background: white; border: 1px solid #E5E7EB; border-left: 3px solid #593B1D; padding: 16px; margin: 20px 0;">
                  <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Je hebt je aangemeld voor:</p>
                  <p style="font-size: 14px; font-weight: bold; margin: 0;">${taken.join(', ')}</p>
                </div>
                ` : ''}
                <p style="font-size: 14px; color: #6B7280; text-align: center; font-style: italic; margin-top: 24px;">
                  "De beste onder de mensen is degene die het meest nuttig is voor anderen."
                  <br /><span style="color: #593B1D; font-weight: 600;">— Hadith</span>
                </p>
              </div>
              <div style="padding: 16px; text-align: center; font-size: 12px; color: #9CA3AF;">
                ${mosqueName}${settings?.email ? ` — ${settings.email}` : ''}
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Vrijwilliger bevestigingsmail fout:', emailErr);
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
