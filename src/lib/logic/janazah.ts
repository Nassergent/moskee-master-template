// ── Janazah & Crisis Logic ──────────────────────────────────────────
// Pure functions — no side effects, no imports from services

export interface JanazahAlert {
  _id: string;
  naamOverledene?: string;
  gebedstijdstip?: string;
  gebeddatum?: string;
  duaArabisch?: string;
  familyConsent?: boolean;
  actief?: boolean;
}

export interface JanazahStep {
  icoon?: string;
  titelNL: string;
  titelAR?: string;
  tekst?: string;
}

export interface JanazahProcedure {
  titel?: string;
  noodnummer?: string;
  introductie?: string;
  stappen?: JanazahStep[];
  seoDescription?: string;
}

/** Check if a janazah alert is currently active */
export function isJanazahActive(alert: JanazahAlert | null): boolean {
  return alert?.actief === true;
}

/** Get display name respecting family consent */
export function getDisplayName(alert: JanazahAlert): string {
  if (alert.familyConsent && alert.naamOverledene) {
    return alert.naamOverledene;
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
