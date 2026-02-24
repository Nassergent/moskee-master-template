/**
 * Reconciliation Service — compares Mollie payments against Sanity project totals.
 * Read-only: detects diffs but does NOT auto-patch.
 */

import { createMollieClient } from '@mollie/api-client';
import { fetchAllActiveProjectTotals } from '../lib/sanity';
import { stringToCents } from '../lib/logic/webhook-validators';
import { compareTotals, groupPaymentsByProject, parseSinceParam } from '../lib/logic/reconcile-utils';
import type { ProjectTotal, ReconcileDiff } from '../lib/logic/reconcile-utils';

export interface ReconciliationResult {
  checkedProjects: number;
  diffs: ReconcileDiff[];
  since: string;
}

/**
 * Fetch all paid Mollie payments since a given date, paginating through results.
 */
async function fetchPaymentsSince(
  since: Date,
  mollieApiKey: string
): Promise<Array<{ metadata: any; amountCents: number }>> {
  const mollieClient = createMollieClient({ apiKey: mollieApiKey });
  const payments: Array<{ metadata: any; amountCents: number }> = [];

  let page = await mollieClient.payments.page({ limit: 250 });

  while (true) {
    for (const p of page) {
      const createdAt = new Date(p.createdAt);
      if (createdAt < since) {
        // Mollie returns payments newest-first; once we're past 'since', stop
        return payments;
      }

      if (p.status === 'paid') {
        payments.push({
          metadata: p.metadata,
          amountCents: stringToCents(p.amount.value),
        });
      }
    }

    if (!page.nextPageCursor) break;
    page = await mollieClient.payments.page({ limit: 250, from: page.nextPageCursor });
  }

  return payments;
}

/**
 * Fetch Sanity project totals and convert to ProjectTotal format.
 */
async function fetchSanityTotals(): Promise<ProjectTotal[]> {
  const projects = await fetchAllActiveProjectTotals();
  return projects.map((p: any) => ({
    projectId: p._id,
    projectName: p.titel,
    totalCents: p.huidigBedragCents || 0,
  }));
}

/**
 * Run a reconciliation between Mollie payments and Sanity totals.
 * This is read-only — it returns diffs but does not patch anything.
 */
export async function runReconciliation(opts: {
  since: string;
  mollieApiKey: string;
}): Promise<ReconciliationResult> {
  const sinceDate = parseSinceParam(opts.since);

  const [molliePayments, sanityTotals] = await Promise.all([
    fetchPaymentsSince(sinceDate, opts.mollieApiKey),
    fetchSanityTotals(),
  ]);

  const mollieTotals = groupPaymentsByProject(molliePayments);
  const diffs = compareTotals(mollieTotals, sanityTotals);

  return {
    checkedProjects: sanityTotals.length,
    diffs,
    since: sinceDate.toISOString(),
  };
}
