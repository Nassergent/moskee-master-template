/**
 * Pure project data transformation utilities.
 * No side effects, no fetch, no env vars.
 */

export interface ProjectOption {
  titel: string;
  slug: string;
}

export interface ProjectStats {
  /** Total raised in euros (converted from cents) */
  totalRaised: number;
  activeCount: number;
  options: ProjectOption[];
}

/**
 * Calculate aggregate project stats.
 * Projects store huidigBedragCents as integer cents.
 */
export function calculateProjectStats(projecten: any[]): ProjectStats {
  const totalCents = projecten.reduce(
    (sum: number, p: any) => sum + (p.huidigBedragCents || 0),
    0
  );
  return {
    totalRaised: totalCents / 100,
    activeCount: projecten.length,
    options: projecten.map((p: any) => ({
      titel: p.titel,
      slug: p.slug?.current || p.titel.toLowerCase().replace(/\s+/g, '-'),
    })),
  };
}
