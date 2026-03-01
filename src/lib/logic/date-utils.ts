/**
 * date-utils.ts — Pure date calculation functions
 * No side effects, no imports from services
 */

/** Calculate days until a given date from today (midnight) */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const todayMidnight = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((target - todayMidnight) / (1000 * 60 * 60 * 24));
}

/** Format a date string as full localized date (weekday, day, month, year). */
export function formatFullDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Format a date string as short date (day + short month). */
export function formatShortDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric', month: 'short',
  });
}

/** Format a date string as schedule date (short weekday + day + long month). */
export function formatScheduleDate(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

/** Get the current year. */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}
