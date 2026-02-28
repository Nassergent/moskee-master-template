/**
 * education.ts — Pure logic for lesson schedules, Ramadan override & smart filtering
 *
 * Compartiment: Logic (pure, no side effects)
 */

// ── Interfaces ──

export interface ScheduleEntry {
  dag: string;
  startTijd: string;
  eindTijd: string;
  actief?: boolean;
  _key?: string;
}

export interface RamadanEntry {
  datum: string;
  startTijd: string;
  eindTijd: string;
  notitie?: string;
  _key?: string;
}

export interface RamadanOverride {
  ingeschakeld?: boolean;
  omschrijving?: string;
  rooster?: RamadanEntry[];
}

export interface EffectiveSchedule {
  type: 'normal' | 'ramadan';
  items: ScheduleEntry[] | RamadanEntry[];
  omschrijving?: string;
}

export interface LessonProgram {
  _id: string;
  titel: string;
  categorie?: string;
  beschrijving?: string;
  inhoud?: any[];
  afbeelding?: any;
  maxCapaciteit?: number;
  inschrijvingOpen?: boolean;
  vrijwilligersLink?: string;
  rooster?: ScheduleEntry[];
  volgorde?: number;
}

// ── Day ordering ──

const dagVolgorde: Record<string, number> = {
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zondag: 7,
};

/**
 * Sort schedule entries by day of week (maandag → zondag).
 */
export function sortByDay(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort(
    (a, b) => (dagVolgorde[a.dag] ?? 99) - (dagVolgorde[b.dag] ?? 99)
  );
}

/**
 * Capitalize first letter of a day name.
 */
export function capitalizeDag(dag: string): string {
  if (!dag) return '';
  return dag.charAt(0).toUpperCase() + dag.slice(1);
}

/**
 * Determine effective schedule: Ramadan override or normal (filtered on actief).
 */
export function getEffectiveSchedule(
  normalSchedule: ScheduleEntry[] | undefined,
  ramadanOverride: RamadanOverride | null | undefined
): EffectiveSchedule {
  if (
    ramadanOverride?.ingeschakeld === true &&
    ramadanOverride.rooster &&
    ramadanOverride.rooster.length > 0
  ) {
    return {
      type: 'ramadan',
      items: ramadanOverride.rooster,
      omschrijving: ramadanOverride.omschrijving,
    };
  }

  const active = (normalSchedule || []).filter((e) => e.actief !== false);
  return {
    type: 'normal',
    items: sortByDay(active),
  };
}

// ── Smart Filtering ──

const categorieVolgorde: Record<string, number> = {
  kinderen: 1,
  jongeren: 2,
  vrouwen: 3,
  mannen: 4,
  algemeen: 5,
};

/**
 * Extract unique categories from active lesson programs, sorted by fixed order.
 */
export function getUniqueCategories(programs: LessonProgram[]): string[] {
  const cats = new Set<string>();
  for (const p of programs) {
    if (p.categorie) cats.add(p.categorie);
  }
  return [...cats].sort(
    (a, b) => (categorieVolgorde[a] ?? 99) - (categorieVolgorde[b] ?? 99)
  );
}

/**
 * Show filter bar only when there are multiple distinct categories.
 */
export function shouldShowFilter(programs: LessonProgram[]): boolean {
  return getUniqueCategories(programs).length > 1;
}

/**
 * Capitalize category name for display.
 */
export const capitalizeCategorie = capitalizeDag;

/**
 * Generate a URL-safe anchor ID from a category name.
 */
export function categoryToAnchor(cat: string): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}
