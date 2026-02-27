// Pure functie — geen fetch, geen side effects

const DEFAULTS = {
  locale: 'nl-BE',
  timezone: 'Europe/Brussels',
  country: 'BE',
} as const;

export function buildSiteConfig(settings: any) {
  return {
    locale: settings?.locale ?? DEFAULTS.locale,
    timezone: settings?.timezone ?? DEFAULTS.timezone,
    country: settings?.country ?? DEFAULTS.country,
    mosqueName: settings?.mosqueName ?? 'Moskee',
  };
}

export function formatDate(date: Date | string, locale: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(locale, options);
}

export function formatCurrency(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency: 'EUR' });
}
