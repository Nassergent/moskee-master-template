/**
 * Pure donation calculation utilities.
 * No side effects, no fetch, no env vars.
 */

export interface DonationProgress {
  percentage: number;
  /** Remaining amount in euros */
  remaining: number;
  /** Current amount in euros (converted from cents) */
  huidigEuros: number;
  isUrgent: boolean;
  isComplete: boolean;
}

/**
 * Calculate donation progress.
 * @param huidigBedragCents - current amount in integer cents
 * @param doelbedrag - goal amount in euros
 */
export function calculateDonationProgress(
  huidigBedragCents: number,
  doelbedrag: number
): DonationProgress {
  const huidigEuros = huidigBedragCents / 100;
  const percentage = doelbedrag > 0
    ? Math.min(Math.round((huidigEuros / doelbedrag) * 100), 100)
    : 0;
  const remaining = doelbedrag > 0
    ? Math.max(doelbedrag - huidigEuros, 0)
    : 0;
  const isUrgent = percentage >= 80 && percentage < 100;
  const isComplete = percentage >= 100;
  return { percentage, remaining, huidigEuros, isUrgent, isComplete };
}

export interface DonationParams {
  bedrag: string | null;
  bestemming: string | null;
  isDemo: boolean;
}

export function parseDonationParams(url: URL): DonationParams {
  return {
    bedrag: url.searchParams.get('bedrag'),
    bestemming: url.searchParams.get('bestemming'),
    isDemo: url.searchParams.get('demo') === 'true',
  };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}
