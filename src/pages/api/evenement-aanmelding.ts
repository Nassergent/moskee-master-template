import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp, isValidEmail, sanitize, isBot, checkOrigin } from '../../lib/security';
import { fetchEventOccupancy } from '../../lib/sanity';
import { freshClient } from '../../../sanity/lib/client';
import { createEventRegistration } from '../../services/event-registration-service';
import { sendEventRegistrationEmails } from '../../services/email-service';
import { Redis } from '@upstash/redis';

export const prerender = false;

// Redis lock helpers
let redis: Redis | null = null;
try {
  const redisUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
  }
} catch {
  // Fail-open: no Redis = no lock
}

async function acquireLock(key: string, ttlSeconds: number = 5): Promise<boolean> {
  if (!redis) return true; // fail-open
  try {
    const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch {
    return true; // fail-open
  }
}

async function releaseLock(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // best-effort
  }
}

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

    // Rate limiting: max 3 per IP per minuut
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 3, 60_000))) {
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

    // Sanitize input
    const name = sanitize(data.name, 100);
    const email = sanitize(data.email, 200);
    const phone = sanitize(data.phone, 20);
    const notes = sanitize(data.notes, 1000);
    const partySize = Math.max(1, Math.min(20, Math.floor(Number(data.partySize) || 1)));
    const eventId = sanitize(data.eventId, 100);

    // Validate
    if (!name || name.length < 2) {
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

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Evenement ontbreekt.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch event for deadline + capacity check
    const event = await freshClient.fetch(
      `*[_type == "agendaEvent" && _id == $eventId][0]{ _id, titel, registrationOpen, registrationMax, registrationDeadline }`,
      { eventId }
    );

    if (!event || !event.registrationOpen) {
      return new Response(JSON.stringify({ error: 'Inschrijving is niet geopend voor dit evenement.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deadline check
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return new Response(JSON.stringify({ error: 'De inschrijfdeadline voor dit evenement is verstreken.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Acquire lock
    const lockKey = `event:${eventId}:registration`;
    const locked = await acquireLock(lockKey);
    if (!locked) {
      return new Response(JSON.stringify({ error: 'Even geduld, een andere inschrijving wordt verwerkt. Probeer het opnieuw.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Seat-based capacity check (only if registrationMax is set)
      if (event.registrationMax) {
        const occupancy = await fetchEventOccupancy(eventId);
        if (occupancy + partySize > event.registrationMax) {
          return new Response(JSON.stringify({ error: 'Dit evenement is volzet. Er zijn niet genoeg plaatsen beschikbaar.' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Write to Sanity
      await createEventRegistration({ eventId, name, email, phone, partySize, notes });
    } finally {
      // Always release lock
      await releaseLock(lockKey);
    }

    // Send emails (best-effort, retry x2)
    const eventTitle = event.titel || 'Evenement';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await sendEventRegistrationEmails({ name, email, phone, partySize, notes, eventTitle });
        break;
      } catch (emailErr) {
        console.error(`Evenement inschrijving e-mail fout (poging ${attempt}):`, emailErr);
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Evenement aanmelding API error:', error);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
