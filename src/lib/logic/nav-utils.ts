/**
 * nav-utils.ts — Navigatie logica
 *
 * Compartiment: LOGICA
 * Pure functies, geen side-effects.
 */

/** Check of een nav-item actief is op basis van het huidige pad */
export function isNavItemActive(currentPath: string, itemHref: string): boolean {
  return currentPath === itemHref || (itemHref !== '/' && currentPath.startsWith(itemHref));
}
