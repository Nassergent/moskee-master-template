import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { fetchSettings } from '../../lib/sanity';
import { checkRateLimit, getClientIp, checkOrigin, isBot } from '../../lib/security';
import { validatePaymentAmount } from '../../lib/logic/payment-validators';
import { generateCorrelationId } from '../../lib/logic/webhook-validators';
import { isMollieDemoMode } from '../../lib/env';
import { formatLog } from '../../lib/logic/logger';

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

    // Rate limiting: max 5 donaties per IP per minuut — hard-fail wanneer Redis onbereikbaar
    const ip = getClientIp(request);
    const rl = await checkRateLimit(ip, 'hard-fail', 5, 60_000, '/api/donate');

    if (!rl.allowed && rl.source === 'hard-fail') {
      return new Response(JSON.stringify({ error: 'Betalingsservice tijdelijk niet beschikbaar.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    const { amount, frequency, projectId, projectName, email } = data;
    // Legacy compat: accept old 'project' field from cached frontends
    const resolvedProjectName = projectName || data.project || 'Algemene Sadaqa';
    const resolvedProjectId = projectId || '';

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

    // Fetch via centralized Sanity layer
    const settings = await fetchSettings();
    const mosqueName = settings?.mosqueName || 'Moskee';

    const mollieKey = import.meta.env.MOLLIE_API_KEY!;
    const mollieClient = createMollieClient({ apiKey: mollieKey });

    const tenantId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'default';
    const correlationId = generateCorrelationId();

    const description = resolvedProjectId && resolvedProjectId !== 'algemeen'
      ? `Donatie: ${resolvedProjectName} — ${mosqueName}`
      : `Donatie — ${mosqueName}`;

    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: numAmount.toFixed(2),
      },
      description,
      redirectUrl: `${siteOrigin}/bedankt?bedrag=${numAmount.toFixed(2)}&bestemming=${encodeURIComponent(resolvedProjectName)}`,
      webhookUrl: `${siteOrigin}/api/mollie-webhook`,
      metadata: {
        projectId: resolvedProjectId || undefined,
        projectName: resolvedProjectName,
        tenantId,
        correlationId,
        frequency, // TODO: Implement via Mollie Subscriptions API when ready
        project: resolvedProjectName,  // Legacy: kept for in-flight backward compat
        email: email || '',
      },
    });

    return new Response(JSON.stringify({
      success: true,
      redirectUrl: payment.getCheckoutUrl(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(formatLog('error', 'donate_error', {}, error));
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden bij het aanmaken van de betaling.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
