import type { APIRoute } from 'astro';
import { runReconciliation } from '../../../services/reconcile-service';
import { formatLog } from '../../../lib/logic/logger';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  // ── Auth: Vercel cron signature OR cron secret header ──
  const cronSecret = import.meta.env.CRON_SECRET;
  const vercelSig = request.headers.get('x-vercel-cron-signature');
  const headerSecret = request.headers.get('x-cron-secret');

  if (cronSecret) {
    const authorized = vercelSig === cronSecret || headerSecret === cronSecret;
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const mollieKey = import.meta.env.MOLLIE_API_KEY;
  if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
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
