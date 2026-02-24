/**
 * prayer-engine.ts — WaqfOS Native Prayer Engine
 *
 * Compartiment: LOGICA
 * Pure functies, geen side-effects, geen UI, geen API calls.
 * Alle berekeningen zijn timezone-aware via IANA timezone strings.
 */

import {
  PrayerTimes,
  CalculationMethod,
  Coordinates,
  Madhab,
  HighLatitudeRule,
  type CalculationParameters,
} from 'adhan';

// ── Types ──────────────────────────────────────────────────────────

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export interface JumuahShift {
  label: string;
  time: string;
  note?: string;
}

export interface PrayerEngineConfig {
  coordinates: { lat: number; lng: number };
  timezone: string;
  method: string;
  madhab: 'shafi' | 'hanafi';
  highLatitudeRule?: string;
  adhanOffsets?: Partial<Record<PrayerName, number>>;
  iqamaConfig?: Partial<Record<PrayerName, IqamaConfigEntry>>;
}

export interface IqamaConfigEntry {
  enabled: boolean;
  type: 'offset' | 'fixed';
  minutes?: number;
  time?: string;      // HH:mm
  dayOffset?: number;  // 0 or 1
}

export interface ComputedPrayerTimes {
  date: string;           // YYYY-MM-DD
  timezone: string;
  adhan: Record<PrayerName, string>;        // HH:mm
  iqama: Record<PrayerName, string | null>; // HH:mm or null
  sunrise: string;        // HH:mm (Shurooq)
  jumuah: JumuahShift[];
  meta: {
    source: 'computed' | 'cache' | 'fallback';
    method: string;
    madhab: string;
    calculatedAt: string; // ISO timestamp
  };
}

export interface PrayerStatus {
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName;
  secondsUntilNext: number;
}

// ── Method Mapping ─────────────────────────────────────────────────

const METHOD_MAP: Record<string, CalculationParameters> = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague(),
  NorthAmerica: CalculationMethod.NorthAmerica(),
  Egyptian: CalculationMethod.Egyptian(),
  UmmAlQura: CalculationMethod.UmmAlQura(),
  Karachi: CalculationMethod.Karachi(),
  Turkey: CalculationMethod.Turkey(),
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee(),
  Dubai: CalculationMethod.Dubai(),
  Kuwait: CalculationMethod.Kuwait(),
  Qatar: CalculationMethod.Qatar(),
  Singapore: CalculationMethod.Singapore(),
  Tehran: CalculationMethod.Tehran(),
};

const HIGH_LAT_MAP: Record<string, typeof HighLatitudeRule[keyof typeof HighLatitudeRule]> = {
  middleOfTheNight: HighLatitudeRule.MiddleOfTheNight,
  seventhOfTheNight: HighLatitudeRule.SeventhOfTheNight,
  twilightAngle: HighLatitudeRule.TwilightAngle,
};

// ── Display Formatters ─────────────────────────────────────────────

/** Format seconds as "HH:MM:SS" countdown string */
export function formatCountdownHMS(secs: number): string {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format seconds as compact "Xu Ym" countdown string */
export function formatCountdownCompact(secs: number): string {
  if (secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}u ${m}m`;
  return `${m}m`;
}

/** Compute iqama offset in minutes from adhan time, e.g. "+15" */
export function getIqamaOffset(adhan: string, iqama: string | null): string | null {
  if (!iqama) return null;
  const [ah, am] = adhan.split(':').map(Number);
  const [ih, im] = iqama.split(':').map(Number);
  let diff = (ih * 60 + im) - (ah * 60 + am);
  if (diff < 0) diff += 1440;
  return `+${diff}`;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Format a Date to HH:mm in a specific IANA timezone */
function formatTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);

  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

/** Parse HH:mm to minutes since midnight */
function parseHHmm(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to HH:mm */
function minutesToHHmm(minutes: number): string {
  const totalMinutes = ((minutes % 1440) + 1440) % 1440; // handle negative & overflow
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Get current time as minutes since midnight in a timezone */
function nowAsMinutes(timezone: string): number {
  const now = new Date();
  return parseHHmm(formatTime(now, timezone));
}

// ── Core Functions ─────────────────────────────────────────────────

/**
 * Compute raw adhan times for a given date and config.
 * Returns HH:mm strings in the configured timezone.
 */
export function computeAdhanTimes(
  date: Date,
  config: PrayerEngineConfig
): Record<PrayerName, string> {
  const coords = new Coordinates(config.coordinates.lat, config.coordinates.lng);

  const params = METHOD_MAP[config.method] || CalculationMethod.MuslimWorldLeague();
  params.madhab = config.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  if (config.highLatitudeRule && HIGH_LAT_MAP[config.highLatitudeRule]) {
    params.highLatitudeRule = HIGH_LAT_MAP[config.highLatitudeRule];
  }

  const pt = new PrayerTimes(coords, date, params);

  return {
    fajr: formatTime(pt.fajr, config.timezone),
    dhuhr: formatTime(pt.dhuhr, config.timezone),
    asr: formatTime(pt.asr, config.timezone),
    maghrib: formatTime(pt.maghrib, config.timezone),
    isha: formatTime(pt.isha, config.timezone),
  };
}

/**
 * Apply manual minute corrections to adhan times.
 */
export function applyAdhanOffsets(
  times: Record<PrayerName, string>,
  offsets: Partial<Record<PrayerName, number>>
): Record<PrayerName, string> {
  const result = { ...times };

  for (const prayer of PRAYER_NAMES) {
    const offset = offsets[prayer];
    if (offset && offset !== 0) {
      const minutes = parseHHmm(times[prayer]) + offset;
      result[prayer] = minutesToHHmm(minutes);
    }
  }

  return result;
}

/**
 * Compute iqama times based on adhan times and iqama configuration.
 * Returns null for prayers where iqama is disabled.
 */
export function computeIqamaTimes(
  adhanTimes: Record<PrayerName, string>,
  iqamaConfig: Partial<Record<PrayerName, IqamaConfigEntry>> | undefined,
  _timezone: string
): Record<PrayerName, string | null> {
  const result: Record<PrayerName, string | null> = {
    fajr: null,
    dhuhr: null,
    asr: null,
    maghrib: null,
    isha: null,
  };

  if (!iqamaConfig) return result;

  for (const prayer of PRAYER_NAMES) {
    const cfg = iqamaConfig[prayer];
    if (!cfg || !cfg.enabled) {
      result[prayer] = null;
      continue;
    }

    if (cfg.type === 'offset' && cfg.minutes != null) {
      const adhanMinutes = parseHHmm(adhanTimes[prayer]);
      result[prayer] = minutesToHHmm(adhanMinutes + cfg.minutes);
    } else if (cfg.type === 'fixed' && cfg.time) {
      // Fixed time with optional dayOffset (for after-midnight Isha)
      result[prayer] = cfg.time;
    } else {
      result[prayer] = null;
    }
  }

  return result;
}

/**
 * Determine current prayer, next prayer, and countdown.
 * Fully timezone-aware using Intl.DateTimeFormat.
 */
export function getPrayerStatus(
  now: Date,
  computedTimes: ComputedPrayerTimes
): PrayerStatus {
  const tz = computedTimes.timezone;
  const nowMinutes = parseHHmm(formatTime(now, tz));

  // Build sorted list of prayer minutes
  const prayerMinutes: { name: PrayerName; minutes: number }[] = PRAYER_NAMES.map(name => ({
    name,
    minutes: parseHHmm(computedTimes.adhan[name]),
  }));

  // Find current and next prayer
  let currentPrayer: PrayerName | null = null;
  let nextPrayer: PrayerName = 'fajr';
  let secondsUntilNext = 0;

  // Walk through prayers in order
  for (let i = 0; i < prayerMinutes.length; i++) {
    const thisPrayer = prayerMinutes[i];
    const nextInList = prayerMinutes[i + 1];

    if (nowMinutes >= thisPrayer.minutes) {
      if (!nextInList || nowMinutes < nextInList.minutes) {
        currentPrayer = thisPrayer.name;
        if (nextInList) {
          nextPrayer = nextInList.name;
          secondsUntilNext = (nextInList.minutes - nowMinutes) * 60;
        } else {
          // After Isha — next is Fajr (tomorrow)
          nextPrayer = 'fajr';
          const fajrMinutes = prayerMinutes[0].minutes;
          secondsUntilNext = ((1440 - nowMinutes) + fajrMinutes) * 60;
        }
        break;
      }
    }
  }

  // Before Fajr — no current prayer, next is Fajr
  if (currentPrayer === null && nowMinutes < prayerMinutes[0].minutes) {
    nextPrayer = 'fajr';
    secondsUntilNext = (prayerMinutes[0].minutes - nowMinutes) * 60;
  }

  return { currentPrayer, nextPrayer, secondsUntilNext };
}

/**
 * Full computation pipeline: config → ComputedPrayerTimes
 */
export function computeFullPrayerTimes(
  date: Date,
  config: PrayerEngineConfig,
  jumuah: JumuahShift[] = []
): ComputedPrayerTimes {
  const rawAdhan = computeAdhanTimes(date, config);
  const adhan = config.adhanOffsets
    ? applyAdhanOffsets(rawAdhan, config.adhanOffsets)
    : rawAdhan;
  const iqama = computeIqamaTimes(adhan, config.iqamaConfig, config.timezone);

  // Compute sunrise (Shurooq) separately
  const coords = new Coordinates(config.coordinates.lat, config.coordinates.lng);
  const params = METHOD_MAP[config.method] || CalculationMethod.MuslimWorldLeague();
  params.madhab = config.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  if (config.highLatitudeRule && HIGH_LAT_MAP[config.highLatitudeRule]) {
    params.highLatitudeRule = HIGH_LAT_MAP[config.highLatitudeRule];
  }
  const pt = new PrayerTimes(coords, date, params);
  const sunrise = formatTime(pt.sunrise, config.timezone);

  return {
    date: date.toISOString().split('T')[0],
    timezone: config.timezone,
    adhan,
    iqama,
    sunrise,
    jumuah,
    meta: {
      source: 'computed',
      method: config.method,
      madhab: config.madhab,
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Check if prayer config has all required fields for computation.
 */
export function isEngineConfigComplete(prayerSettings: any): boolean {
  return !!(
    prayerSettings?.coordinates?.lat != null &&
    prayerSettings?.coordinates?.lng != null &&
    prayerSettings?.timezone &&
    prayerSettings?.method
  );
}

/**
 * Build a PrayerEngineConfig from Sanity prayerSettings document.
 */
export function buildConfigFromSanity(settings: any): PrayerEngineConfig {
  return {
    coordinates: {
      lat: settings.coordinates.lat,
      lng: settings.coordinates.lng,
    },
    timezone: settings.timezone || 'Europe/Brussels',
    method: settings.method || 'MuslimWorldLeague',
    madhab: settings.madhab || 'shafi',
    highLatitudeRule: settings.highLatitudeRule || 'middleOfTheNight',
    adhanOffsets: settings.adhanOffsets || {},
    iqamaConfig: settings.iqamaConfig || {},
  };
}
