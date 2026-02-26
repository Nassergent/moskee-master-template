// ── Janazah & Crisis Logic ──────────────────────────────────────────
// Pure functions — no side effects, no imports from services

export interface JanazahAlert {
  _id: string;
  naamOverledene?: string;
  naGebed?: string;
  gebedstijdstip?: string;
  gebeddatum?: string;
  duaArabisch?: string;
  familyConsent?: boolean;
  actief?: boolean;
}

/**
 * Bouw een schone gebedsinfo-zin op.
 * Resultaat: "Janazah-gebed op vrijdag 27 februari na het Dhuhr-gebed om 14:00."
 */
export function buildGebedZin(alert: JanazahAlert): string {
  const parts: string[] = ['Janazah-gebed'];

  if (alert.gebeddatum) {
    const datum = new Date(alert.gebeddatum + 'T00:00:00').toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    parts.push(`op ${datum}`);
  }

  if (alert.naGebed) {
    parts.push(`na het ${alert.naGebed}`);
  }

  if (alert.gebedstijdstip) {
    parts.push(`om ${alert.gebedstijdstip}`);
  }

  // Alleen een zin als er meer info is dan alleen "Janazah-gebed"
  if (parts.length === 1) return '';
  return parts.join(' ') + '.';
}

export interface JanazahStep {
  icoon?: string;
  titelNL: string;
  titelAR?: string;
  tekst?: any[]; // Portable Text blocks
}

export interface JanazahProcedure {
  titel?: string;
  noodnummer?: string;
  introductie?: any[]; // Portable Text blocks
  stappen?: JanazahStep[];
}

/** Check if a janazah alert is currently active */
export function isJanazahActive(alert: JanazahAlert | null): boolean {
  return alert?.actief === true;
}

/** Capitalize each word: "abdel ali" → "Abdel Ali" */
function capitalizeWords(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Get display name respecting family consent, auto-capitalized */
export function getDisplayName(alert: JanazahAlert): string {
  if (alert.familyConsent && alert.naamOverledene) {
    return capitalizeWords(alert.naamOverledene.trim());
  }
  return 'een gemeentelid';
}

/** Map icon key to display character */
export function getStepIcon(icoon?: string): string {
  const icons: Record<string, string> = {
    water: '💧',
    gebed: '🤲',
    begrafenis: '🕊️',
    hart: '❤️',
    boek: '📖',
  };
  return icoon ? icons[icoon] || '' : '';
}
