import type { APIRoute } from 'astro';
import { runReconciliation } from '../../../services/reconcile-service';
import { formatLog } from '../../../lib/logic/logger';
import { isMollieDemoMode } from '../../../lib/env';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  // ── Auth: Vercel cron signature OR cron secret header ──
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'Reconciliation service not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vercelSig = request.headers.get('x-vercel-cron-signature');
  const isProduction = import.meta.env.PROD;
  // In production: alleen Vercel cron signature accepteren
  // In dev: ook custom header voor lokale tests
  const authorized = isProduction
    ? vercelSig === cronSecret
    : (vercelSig === cronSecret || request.headers.get('x-cron-secret') === cronSecret);

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mollieKey = import.meta.env.MOLLIE_API_KEY;
  if (!mollieKey || isMollieDemoMode()) {
    return new Response(JSON.stringify({ error: 'Mollie not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const since = url.searchParams.get('since') || '24h';

  try {
    console.log(formatLog('info', 'reconcile_start', { since }));

    const result = await runReconciliation({ since, mollieApiKey: mollieKey });

    if (result.diffs.length > 0) {
      console.log(formatLog('warn', 'reconcile_diff', {
        checkedProjects: result.checkedProjects,
        diffs: result.diffs.length,
      }));
      for (const diff of result.diffs) {
        console.log(formatLog('warn', 'reconcile_diff', {
          projectId: diff.projectId,
          projectName: diff.projectName,
          mollieCents: diff.mollieCents,
          sanityCents: diff.sanityCents,
          diffCents: diff.diffCents,
        }));
      }
    }

    console.log(formatLog('info', 'reconcile_complete', {
      checkedProjects: result.checkedProjects,
      diffs: result.diffs.length,
      since: result.since,
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(formatLog('error', 'reconcile_complete', { since }, error));
    return new Response(JSON.stringify({ error: 'Reconciliation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
