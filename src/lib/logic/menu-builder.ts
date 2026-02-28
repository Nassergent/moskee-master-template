/**
 * menu-builder.ts — Builds visible navigation menu from settings
 *
 * Compartiment: Logic (pure, no side effects)
 */

export interface MenuItem {
  name: string;
  href: string;
  show: boolean;
}

/** Feature flag names matching menuToggles fields in Sanity */
export type FeatureFlag =
  | 'showServices'
  | 'showLessen'
  | 'showProjects'
  | 'showAbout'
  | 'showMollie'
  | 'showDonaties'
  | 'showAgenda'
  | 'showJanazah'
  | 'showGebedstijden'
  | 'showVrijwilligers'
  | 'showNieuws';

/**
 * Check if a feature is enabled via menuToggles.
 * Defaults to true for backward compatibility (existing moskeeën without the toggle).
 */
export function isFeatureEnabled(settings: any, feature: FeatureFlag): boolean {
  return settings?.menuToggles?.[feature] ?? true;
}

/**
 * Build the navigation menu items based on CMS menuToggles.
 * Returns only visible items.
 */
export function buildVisibleMenuItems(settings: any): MenuItem[] {
  const menuItems: MenuItem[] = [
    { name: 'Gebedstijden', href: '/gebedstijden', show: isFeatureEnabled(settings, 'showGebedstijden') },
    { name: 'Activiteiten', href: '/agenda', show: isFeatureEnabled(settings, 'showAgenda') },
    { name: 'Lessen', href: '/lessen', show: isFeatureEnabled(settings, 'showLessen') },
    { name: 'Diensten', href: '/diensten', show: isFeatureEnabled(settings, 'showServices') },
    { name: 'Nieuws', href: '/nieuws', show: isFeatureEnabled(settings, 'showNieuws') },
    { name: 'Over Ons', href: '/over-ons', show: isFeatureEnabled(settings, 'showAbout') },
    { name: 'Contact', href: '/contact', show: true },
  ];

  return menuItems.filter((item) => item.show);
}
