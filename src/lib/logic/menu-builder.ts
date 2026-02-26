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

/**
 * Build the navigation menu items based on CMS menuToggles.
 * Returns only visible items.
 */
export function buildVisibleMenuItems(settings: any): MenuItem[] {
  const menuItems: MenuItem[] = [
    { name: 'Gebedstijden', href: '/gebedstijden', show: true },
    { name: 'Lessen', href: '/lessen', show: settings?.menuToggles?.showLessen ?? true },
    { name: 'Diensten', href: '/diensten', show: settings?.menuToggles?.showServices ?? true },
    { name: 'Artikelen', href: '/nieuws', show: settings?.menuToggles?.showNews ?? true },
    { name: 'Agenda', href: '/agenda', show: settings?.menuToggles?.showAgenda ?? true },
    { name: 'Over Ons', href: '/over-ons', show: settings?.menuToggles?.showAbout ?? true },
    { name: 'Contact', href: '/contact', show: true },
  ];

  return menuItems.filter((item) => item.show);
}
