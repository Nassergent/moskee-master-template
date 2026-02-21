import type { APIRoute } from 'astro';
import { writeClient } from '../../lib/sanity';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { naam, email, telefoon, taken, bericht } = await request.json();

    if (!naam || !email) {
      return new Response(JSON.stringify({ error: 'Naam en e-mail zijn verplicht.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await writeClient.create({
      _type: 'volunteer',
      naam,
      email,
      telefoon: telefoon || '',
      taken: taken || [],
      bericht: bericht || '',
      aanmeldDatum: new Date().toISOString(),
      status: 'nieuw',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vrijwilligers API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
