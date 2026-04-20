/**
 * Pure agenda/event utilities.
 * No side effects, no fetch, no env vars.
 */

export interface FilterCategory {
  titel: string;
  kleur?: string;
  icoon?: string;
}

/**
 * Bouwt de filterbar categorieën op.
 * - Als CMS categorieën beschikbaar: gebruik die (behoud volgorde + kleur).
 * - Filtert alleen categorieën die minstens 1 event hebben.
 * - Fallback: afleiden uit events (zonder kleurdata).
 */
export function buildFilterCategories(
  cmsCategories: any[],
  events: any[]
): FilterCategory[] {
  const eventCats = new Set(events.map((e: any) => e.categorie).filter(Boolean));

  if (cmsCategories && cmsCategories.length > 0) {
    return cmsCategories
      .filter((cat: any) => eventCats.has(cat.titel))
      .map((cat: any) => ({
        titel: cat.titel,
        kleur: cat.kleur || undefined,
        icoon: cat.icoon || undefined,
      }));
  }

  // Fallback: afleiden uit events
  return [...eventCats].map((cat) => ({ titel: cat }));
}

export function formatDatum(datum: string, options?: { year?: boolean; tz?: string; locale?: string }): string {
  return new Date(datum).toLocaleDateString(options?.locale || 'nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(options?.year && { year: 'numeric' }),
    timeZone: options?.tz || 'Europe/Brussels',
  });
}

export function formatTijd(datum: string, tz?: string, locale?: string): string {
  const str = new Date(datum).toLocaleTimeString(locale || 'nl-BE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz || 'Europe/Brussels',
  });
  return str === '00:00' ? '' : str;
}

const ORDINAL_NL: Record<number, string> = {
  1: '1ste', 2: '2de', 3: '3de', 4: '4de', 5: '5de', 6: '6de', 7: '7de', 8: '8ste',
  9: '9de', 10: '10de', 11: '11de', 12: '12de', 13: '13de', 14: '14de', 15: '15de',
  16: '16de', 17: '17de', 18: '18de', 19: '19de', 20: '20ste', 21: '21ste', 22: '22ste',
  23: '23ste', 24: '24ste', 25: '25ste', 26: '26ste', 27: '27ste', 28: '28ste',
  29: '29ste', 30: '30ste', 31: '31ste',
};

/**
 * Geeft een leesbare omschrijving van de herhaling, afgeleid uit de startdatum.
 * - 'weekly'    + wo → "Elke woensdag"
 * - 'biweekly'  + wo → "Om de 2 weken op woensdag"
 * - 'monthly'   + 22 → "Elke maand op de 22ste"
 * Lege string als het event geen frequentie heeft.
 */
export function formatRecurrence(
  event: { frequentie?: string; startDatum?: string },
  options?: { tz?: string; locale?: string }
): string {
  if (!event.frequentie || !event.startDatum) return '';
  const tz = options?.tz || 'Europe/Brussels';
  const locale = options?.locale || 'nl-BE';
  const date = new Date(event.startDatum);

  if (event.frequentie === 'weekly' || event.frequentie === 'biweekly') {
    const weekday = date.toLocaleDateString(locale, { weekday: 'long', timeZone: tz });
    return event.frequentie === 'weekly'
      ? `Elke ${weekday}`
      : `Om de 2 weken op ${weekday}`;
  }

  if (event.frequentie === 'monthly') {
    // Afleiden uit datum in lokale timezone
    const dayStr = date.toLocaleDateString(locale, { day: 'numeric', timeZone: tz });
    const dayNum = parseInt(dayStr, 10);
    const ordinal = ORDINAL_NL[dayNum] || `${dayNum}ste`;
    return `Elke maand op de ${ordinal}`;
  }

  return '';
}
