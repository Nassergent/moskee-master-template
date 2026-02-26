/**
 * education.ts — Pure logic for lesson schedules & Ramadan override
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
  // Ramadan active + has entries → use Ramadan schedule
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

  // Normal schedule: filter only active entries, then sort by day
  const active = (normalSchedule || []).filter((e) => e.actief !== false);
  return {
    type: 'normal',
    items: sortByDay(active),
  };
}
