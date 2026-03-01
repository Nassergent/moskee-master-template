/**
 * event-utils.ts — Pure event logic (registration + countdown)
 * No side effects, no imports from services
 */

import { daysUntil } from './date-utils';

// ── Registration ──

export interface RegistrationStatus {
  isFull: boolean;
  isExpired: boolean;
  spotsLeft: number | null;
  occupancyPercent: number;
}

export function getRegistrationStatus(
  maxCapacity: number | undefined,
  occupancy: number,
  deadline: string | undefined,
): RegistrationStatus {
  return {
    isFull: maxCapacity ? occupancy >= maxCapacity : false,
    isExpired: deadline ? new Date(deadline) < new Date() : false,
    spotsLeft: maxCapacity ? maxCapacity - occupancy : null,
    occupancyPercent: maxCapacity ? Math.min(100, Math.round((occupancy / maxCapacity) * 100)) : 0,
  };
}

// ── Islamic Event Countdown ──

/** Spiritual meaning for known Islamic events. */
export const EVENT_MEANINGS: Record<string, string> = {
  'Start Ramadan': 'De heilige vastenmaand waarin de Quran werd geopenbaard',
  'Laylat al-Qadr': 'De Nacht van de Bestemming — beter dan duizend maanden',
  'Eid al-Fitr': 'Het feest van het verbreken van het vasten',
  'Eid al-Adha': 'Het offerfeest — herdenking van Ibrahim\'s overgave',
  'Dag van Arafah': 'De belangrijkste dag van de Hadj',
  'Ashura': 'Dag van bezinning en vasten',
  "Isra' & Mi'raj": 'De nachtelijke reis en hemelvaart van de Profeet ﷺ',
};

export interface UpcomingEvent {
  name: string;
  nameAr: string;
  gregorianDate: string;
  daysUntil: number;
}

/** Determine the primary upcoming event: CMS override takes priority over API data. */
export function getUpcomingEvent(card: any, apiData: any[]): UpcomingEvent | null {
  const hasCmsOverride = !!(card.evenementTitel && card.evenementDatum);

  if (hasCmsOverride) {
    return {
      name: card.evenementTitel,
      nameAr: card.evenementTitelArabisch || '',
      gregorianDate: card.evenementDatum,
      daysUntil: daysUntil(card.evenementDatum),
    };
  }

  return apiData.length > 0 ? apiData[0] : null;
}

/** Build the "daarna" list: remaining API data, or CMS fallback entries. */
export function getNextEvents(card: any, apiData: any[]): UpcomingEvent[] {
  const hasCmsOverride = !!(card.evenementTitel && card.evenementDatum);

  if (!hasCmsOverride && apiData.length > 1) {
    return apiData.slice(1);
  }

  return (card.komendeDatumsFallback || [])
    .map((d: any) => ({
      name: d.naam,
      nameAr: d.naamArabisch || '',
      gregorianDate: d.datum,
      daysUntil: daysUntil(d.datum),
    }))
    .filter((d: UpcomingEvent) => d.daysUntil >= 0);
}

/** Resolve the spiritual meaning for an event: CMS description or built-in lookup. */
export function getEventMeaning(card: any, eventName: string): string {
  const hasCmsOverride = !!(card.evenementTitel && card.evenementDatum);
  return hasCmsOverride
    ? (card.evenementBeschrijving || '')
    : (EVENT_MEANINGS[eventName] || '');
}
