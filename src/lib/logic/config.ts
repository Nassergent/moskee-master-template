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
