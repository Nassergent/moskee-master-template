/**
 * Pure reconciliation utilities.
 * No side effects, no fetch, no env vars.
 */

export interface ProjectTotal {
  projectId: string;
  projectName: string;
  totalCents: number;
}

export interface ReconcileDiff {
  projectId: string;
  projectName: string;
  mollieCents: number;
  sanityCents: number;
  diffCents: number;
}

/**
 * Compare Mollie payment totals against Sanity project totals.
 * Returns diffs where amounts don't match.
 */
export function compareTotals(
  mollieTotals: ProjectTotal[],
  sanityTotals: ProjectTotal[]
): ReconcileDiff[] {
  const sanityMap = new Map(sanityTotals.map((s) => [s.projectId, s]));
  const diffs: ReconcileDiff[] = [];

  for (const mollie of mollieTotals) {
    const sanity = sanityMap.get(mollie.projectId);
    const sanityCents = sanity?.totalCents ?? 0;

    if (mollie.totalCents !== sanityCents) {
      diffs.push({
        projectId: mollie.projectId,
        projectName: mollie.projectName,
        mollieCents: mollie.totalCents,
        sanityCents,
        diffCents: mollie.totalCents - sanityCents,
      });
    }
  }

  return diffs;
}

/**
 * Group paid Mollie payments by projectId and sum amounts.
 */
export function groupPaymentsByProject(
  payments: Array<{
    metadata: { projectId?: string; projectName?: string } | null;
    amountCents: number;
  }>
): ProjectTotal[] {
  const map = new Map<string, ProjectTotal>();

  for (const p of payments) {
    const id = p.metadata?.projectId;
    if (!id) continue;

    const existing = map.get(id);
    if (existing) {
      existing.totalCents += p.amountCents;
    } else {
      map.set(id, {
        projectId: id,
        projectName: p.metadata?.projectName || 'Onbekend',
        totalCents: p.amountCents,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Parse a "since" parameter to a Date.
 * Accepts: "24h", "7d", "30d", or an ISO date string.
 */
export function parseSinceParam(since: string): Date {
  const match = since.match(/^(\d+)(h|d)$/);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const ms = unit === 'h' ? amount * 3600_000 : amount * 86_400_000;
    return new Date(Date.now() - ms);
  }

  const date = new Date(since);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid since parameter: "${since}"`);
  }
  return date;
}
