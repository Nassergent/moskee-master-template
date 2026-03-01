import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp, checkOrigin, isBot, validateCsrfToken, sanitize, isValidEmail } from '../../lib/security';
import { validatePaymentAmount } from '../../lib/logic/payment-validators';
import { isMollieDemoMode } from '../../lib/env';
import { formatLog } from '../../lib/logic/logger';
import { createDonationPayment } from '../../services/donate-service';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, { status: 302, headers: { Location: '/doneren' } });
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const siteOrigin = url.origin;

    // CSRF origin check
    const originError = checkOrigin(request, siteOrigin);
    if (originError) return originError;

    // Rate limiting: max 5 donaties per IP per minuut — in-memory-fallback (don't block users if Redis is down)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(ip, 'in-memory-fallback', 5, 60_000, '/api/donate');

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
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CSRF double-submit cookie validation
    const csrfError = validateCsrfToken(request, data._csrf);
    if (csrfError) return csrfError;

    const { amount, frequency, projectId, projectName, email } = data;
    // Legacy compat: accept old 'project' field from cached frontends
    const resolvedProjectName = sanitize(projectName || data.project || 'Algemene Sadaqa', 200);
    const resolvedProjectId = sanitize(projectId || '', 100);
    const sanitizedFrequency = sanitize(frequency || '', 50);
    const sanitizedEmail = sanitize(email || '', 254);

    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      return new Response(JSON.stringify({ error: 'Ongeldig e-mailadres.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate via logic compartiment
    const validation = validatePaymentAmount(amount);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const numAmount = validation.amount!;

    if (isMollieDemoMode()) {
      const bedanktParams = new URLSearchParams({
        bedrag: numAmount.toFixed(2),
        bestemming: resolvedProjectName,
        demo: 'true',
      });
      return new Response(JSON.stringify({
        success: true,
        redirectUrl: `${siteOrigin}/bedankt?${bedanktParams.toString()}`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delegate to donate service
    try {
      const result = await createDonationPayment({
        amount: numAmount,
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        email: sanitizedEmail,
        frequency: sanitizedFrequency,
        siteOrigin,
      });

      return new Response(JSON.stringify({
        success: true,
        redirectUrl: result.checkoutUrl,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (serviceErr) {
      const msg = serviceErr instanceof Error ? serviceErr.message : 'Betalingen zijn momenteel niet beschikbaar.';
      return new Response(JSON.stringify({ error: msg }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error(formatLog('error', 'donate_error', {}, error));
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden bij het aanmaken van de betaling.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
