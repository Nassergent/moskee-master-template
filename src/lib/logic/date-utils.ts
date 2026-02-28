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
