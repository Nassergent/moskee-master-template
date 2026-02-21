import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityClient } from '../../lib/sanity';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { naam, email, telefoon, onderwerp, bericht } = data;

    if (!naam || !email || !bericht) {
      return new Response(JSON.stringify({ error: 'Vul alle verplichte velden in.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = import.meta.env.RESEND_API_KEY;

    if (apiKey && apiKey !== 're_xxxxxxxxxxxx') {
      // Haal e-mail dynamisch op uit CMS settings
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
      console.log('Contact form submission (no Resend API key configured):', { naam, email, onderwerp, bericht });
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
