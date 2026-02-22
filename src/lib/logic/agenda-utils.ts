/**
 * Pure agenda/event utilities.
 * No side effects, no fetch, no env vars.
 */

export function extractCategories(events: any[]): string[] {
  return [...new Set(events.map((e: any) => e.categorie).filter(Boolean))];
}

export function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Brussels',
  });
}

export function formatTijd(datum: string): string {
  const str = new Date(datum).toLocaleTimeString('nl-BE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  });
  return str === '00:00' ? '' : str;
}
