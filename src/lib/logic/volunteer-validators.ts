/**
 * volunteer-validators.ts — Input validatie voor vrijwilligers
 *
 * Compartiment: LOGICA
 * Pure functies, geen side-effects.
 */

import { sanitize } from '../security';

/** Sanitize en valideer een array van taken-strings */
export function sanitizeTakenArray(taken: unknown): string[] {
  if (!Array.isArray(taken)) return [];
  return taken
    .filter((t: unknown) => typeof t === 'string')
    .slice(0, 10)
    .map((t: string) => sanitize(t, 50));
}
