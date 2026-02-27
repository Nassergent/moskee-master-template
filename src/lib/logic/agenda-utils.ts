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
