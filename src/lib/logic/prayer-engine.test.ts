/**
 * prayer-engine.test.ts — WaqfOS Prayer Engine Tests
 *
 * Test coverage:
 * 1. Brussels normal day
 * 2. DST start (last Sunday of March)
 * 3. DST end (last Sunday of October)
 * 4. Stockholm June (high latitude)
 * 5. Iqama offset
 * 6. Iqama fixed time
 * 7. Jumu'ah passthrough
 * 8. Missing config → isNativeEngineReady = false
 */

import { describe, it, expect } from 'vitest';
import {
  computeAdhanTimes,
  applyAdhanOffsets,
  computeIqamaTimes,
  getPrayerStatus,
  computeFullPrayerTimes,
  isEngineConfigComplete,
  buildConfigFromSanity,
  PRAYER_NAMES,
  type PrayerEngineConfig,
  type PrayerName,
} from './prayer-engine';

// ── Helpers ──

function makeConfig(overrides: Partial<PrayerEngineConfig> = {}): PrayerEngineConfig {
  return {
    coordinates: { lat: 50.8503, lng: 4.3517 }, // Brussels
    timezone: 'Europe/Brussels',
    method: 'MuslimWorldLeague',
    madhab: 'shafi',
    highLatitudeRule: 'middleOfTheNight',
    ...overrides,
  };
}

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ── 1. Brussels Normal Day ──

describe('Brussels normal day (2026-01-15)', () => {
  const config = makeConfig();
  const date = new Date(2026, 0, 15); // Jan 15, 2026
  const times = computeAdhanTimes(date, config);

  it('returns all 5 prayer times', () => {
    for (const name of PRAYER_NAMES) {
      expect(times[name]).toBeDefined();
      expect(isValidTime(times[name])).toBe(true);
    }
  });

  it('prayers are in correct chronological order', () => {
    const minutes = PRAYER_NAMES.map(n => timeToMinutes(times[n]));
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    }
  });

  it('Fajr is before 08:00 in winter Brussels', () => {
    expect(timeToMinutes(times.fajr)).toBeLessThan(8 * 60);
  });

  it('Dhuhr is around noon (11:30-13:30)', () => {
    const m = timeToMinutes(times.dhuhr);
    expect(m).toBeGreaterThan(11 * 60 + 30);
    expect(m).toBeLessThan(13 * 60 + 30);
  });

  it('Isha is after 17:00 in winter', () => {
    expect(timeToMinutes(times.isha)).toBeGreaterThan(17 * 60);
  });
});

// ── 2. DST Start (last Sunday March 2026 = March 29) ──

describe('DST start day (2026-03-29)', () => {
  const config = makeConfig();
  const date = new Date(2026, 2, 29); // March 29, 2026
  const times = computeAdhanTimes(date, config);

  it('all prayers return valid times on DST transition', () => {
    for (const name of PRAYER_NAMES) {
      expect(isValidTime(times[name])).toBe(true);
    }
  });

  it('prayers maintain chronological order on DST day', () => {
    const minutes = PRAYER_NAMES.map(n => timeToMinutes(times[n]));
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    }
  });
});

// ── 3. DST End (last Sunday October 2026 = October 25) ──

describe('DST end day (2026-10-25)', () => {
  const config = makeConfig();
  const date = new Date(2026, 9, 25); // October 25, 2026
  const times = computeAdhanTimes(date, config);

  it('all prayers return valid times on reverse DST transition', () => {
    for (const name of PRAYER_NAMES) {
      expect(isValidTime(times[name])).toBe(true);
    }
  });

  it('prayers maintain chronological order', () => {
    const minutes = PRAYER_NAMES.map(n => timeToMinutes(times[n]));
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    }
  });
});

// ── 4. Stockholm June (high latitude) ──

describe('Stockholm high latitude (2026-06-21, summer solstice)', () => {
  const config = makeConfig({
    coordinates: { lat: 59.3293, lng: 18.0686 }, // Stockholm
    timezone: 'Europe/Stockholm',
    highLatitudeRule: 'middleOfTheNight',
  });
  const date = new Date(2026, 5, 21); // June 21
  const times = computeAdhanTimes(date, config);

  it('all prayers return valid times even at high latitude', () => {
    for (const name of PRAYER_NAMES) {
      expect(isValidTime(times[name])).toBe(true);
    }
  });

  it('Fajr is very early in Stockholm summer', () => {
    // Fajr should be before 04:00 in Stockholm June
    expect(timeToMinutes(times.fajr)).toBeLessThan(4 * 60);
  });

  it('Isha is calculated (may wrap past midnight via high latitude rule)', () => {
    // middleOfTheNight rule may place Isha after midnight (00:xx)
    // which is correct behavior for extreme latitudes
    expect(isValidTime(times.isha)).toBe(true);
    // Isha should either be very late (22:00+) or wrapped past midnight (00:xx)
    const m = timeToMinutes(times.isha);
    expect(m >= 22 * 60 || m < 3 * 60).toBe(true);
  });
});

// ── 5. Iqama Offset ──

describe('Iqama offset calculation', () => {
  const adhanTimes: Record<PrayerName, string> = {
    fajr: '06:30',
    dhuhr: '12:45',
    asr: '15:30',
    maghrib: '18:00',
    isha: '20:15',
  };

  const iqamaConfig = {
    fajr: { enabled: true, type: 'offset' as const, minutes: 15 },
    dhuhr: { enabled: true, type: 'offset' as const, minutes: 10 },
    asr: { enabled: true, type: 'offset' as const, minutes: 10 },
    maghrib: { enabled: true, type: 'offset' as const, minutes: 5 },
    isha: { enabled: true, type: 'offset' as const, minutes: 15 },
  };

  const iqama = computeIqamaTimes(adhanTimes, iqamaConfig, 'Europe/Brussels');

  it('Fajr iqama = adhan + 15 min', () => {
    expect(iqama.fajr).toBe('06:45');
  });

  it('Dhuhr iqama = adhan + 10 min', () => {
    expect(iqama.dhuhr).toBe('12:55');
  });

  it('Maghrib iqama = adhan + 5 min', () => {
    expect(iqama.maghrib).toBe('18:05');
  });

  it('Isha iqama = adhan + 15 min', () => {
    expect(iqama.isha).toBe('20:30');
  });
});

// ── 6. Iqama Fixed Time ──

describe('Iqama fixed time', () => {
  const adhanTimes: Record<PrayerName, string> = {
    fajr: '06:30',
    dhuhr: '12:45',
    asr: '15:30',
    maghrib: '18:00',
    isha: '20:15',
  };

  const iqamaConfig = {
    fajr: { enabled: true, type: 'fixed' as const, time: '07:00' },
    dhuhr: { enabled: true, type: 'fixed' as const, time: '13:15' },
    asr: { enabled: false, type: 'offset' as const, minutes: 10 },
    maghrib: { enabled: true, type: 'fixed' as const, time: '18:10' },
    isha: { enabled: true, type: 'fixed' as const, time: '21:00' },
  };

  const iqama = computeIqamaTimes(adhanTimes, iqamaConfig, 'Europe/Brussels');

  it('Fajr iqama = fixed 07:00', () => {
    expect(iqama.fajr).toBe('07:00');
  });

  it('Dhuhr iqama = fixed 13:15', () => {
    expect(iqama.dhuhr).toBe('13:15');
  });

  it('Asr iqama = null (disabled)', () => {
    expect(iqama.asr).toBeNull();
  });

  it('Isha iqama = fixed 21:00', () => {
    expect(iqama.isha).toBe('21:00');
  });
});

// ── 7. Adhan Offsets ──

describe('Adhan manual offsets', () => {
  const base: Record<PrayerName, string> = {
    fajr: '06:30',
    dhuhr: '12:45',
    asr: '15:30',
    maghrib: '18:00',
    isha: '20:15',
  };

  it('positive offset shifts later', () => {
    const result = applyAdhanOffsets(base, { fajr: 5 });
    expect(result.fajr).toBe('06:35');
    expect(result.dhuhr).toBe('12:45'); // unchanged
  });

  it('negative offset shifts earlier', () => {
    const result = applyAdhanOffsets(base, { maghrib: -3 });
    expect(result.maghrib).toBe('17:57');
  });

  it('wraps around midnight correctly', () => {
    const lateIsha: Record<PrayerName, string> = { ...base, isha: '23:50' };
    const result = applyAdhanOffsets(lateIsha, { isha: 15 });
    expect(result.isha).toBe('00:05');
  });
});

// ── 8. Jumu'ah Passthrough ──

describe('Jumu\'ah passthrough', () => {
  const config = makeConfig();
  const jumuah = [
    { label: 'Eerste Khutbah', time: '13:00', note: 'Stipt' },
    { label: 'Tweede Khutbah', time: '14:30' },
  ];

  const result = computeFullPrayerTimes(new Date(2026, 0, 16), config, jumuah);

  it('passes jumuah shifts through unchanged', () => {
    expect(result.jumuah).toEqual(jumuah);
    expect(result.jumuah[0].label).toBe('Eerste Khutbah');
    expect(result.jumuah[0].time).toBe('13:00');
    expect(result.jumuah[1].time).toBe('14:30');
  });

  it('meta source is "computed"', () => {
    expect(result.meta.source).toBe('computed');
  });
});

// ── 9. Missing Config → Engine Not Ready ──

describe('isEngineConfigComplete', () => {
  it('returns false when coordinates missing', () => {
    expect(isEngineConfigComplete({
      timezone: 'Europe/Brussels',
      method: 'MWL',
    })).toBe(false);
  });

  it('returns false when timezone missing', () => {
    expect(isEngineConfigComplete({
      coordinates: { lat: 50.85, lng: 4.35 },
      method: 'MWL',
    })).toBe(false);
  });

  it('returns false when method missing', () => {
    expect(isEngineConfigComplete({
      coordinates: { lat: 50.85, lng: 4.35 },
      timezone: 'Europe/Brussels',
    })).toBe(false);
  });

  it('returns true when all required fields present', () => {
    expect(isEngineConfigComplete({
      coordinates: { lat: 50.85, lng: 4.35 },
      timezone: 'Europe/Brussels',
      method: 'MuslimWorldLeague',
    })).toBe(true);
  });
});

// ── 10. getPrayerStatus ──

describe('getPrayerStatus', () => {
  const computed = computeFullPrayerTimes(
    new Date(2026, 0, 15),
    makeConfig(),
  );

  it('returns a valid current and next prayer', () => {
    // Simulate a time during Dhuhr
    const fakeNow = new Date('2026-01-15T13:00:00+01:00');
    const status = getPrayerStatus(fakeNow, computed);

    expect(status.currentPrayer).toBe('dhuhr');
    expect(status.nextPrayer).toBe('asr');
    expect(status.secondsUntilNext).toBeGreaterThan(0);
  });

  it('before Fajr: currentPrayer is null, next is Fajr', () => {
    const earlyMorning = new Date('2026-01-15T03:00:00+01:00');
    const status = getPrayerStatus(earlyMorning, computed);

    expect(status.currentPrayer).toBeNull();
    expect(status.nextPrayer).toBe('fajr');
    expect(status.secondsUntilNext).toBeGreaterThan(0);
  });
});

// ── 11. Full Pipeline ──

describe('computeFullPrayerTimes pipeline', () => {
  const config = makeConfig({
    adhanOffsets: { fajr: 2, isha: -1 },
    iqamaConfig: {
      fajr: { enabled: true, type: 'offset', minutes: 20 },
      dhuhr: { enabled: true, type: 'offset', minutes: 15 },
      asr: { enabled: true, type: 'offset', minutes: 10 },
      maghrib: { enabled: true, type: 'offset', minutes: 5 },
      isha: { enabled: true, type: 'fixed', time: '21:30' },
    },
  });

  const result = computeFullPrayerTimes(new Date(2026, 0, 15), config);

  it('returns valid date string', () => {
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('all adhan times are valid HH:mm', () => {
    for (const name of PRAYER_NAMES) {
      expect(isValidTime(result.adhan[name])).toBe(true);
    }
  });

  it('iqama times are valid or null', () => {
    for (const name of PRAYER_NAMES) {
      const val = result.iqama[name];
      if (val !== null) {
        expect(isValidTime(val)).toBe(true);
      }
    }
  });

  it('Isha iqama is fixed at 21:30', () => {
    expect(result.iqama.isha).toBe('21:30');
  });

  it('meta contains correct method', () => {
    expect(result.meta.method).toBe('MuslimWorldLeague');
    expect(result.meta.madhab).toBe('shafi');
    expect(result.meta.source).toBe('computed');
  });
});

// ── 12. buildConfigFromSanity ──

describe('buildConfigFromSanity', () => {
  it('builds a valid config from Sanity settings', () => {
    const sanityData = {
      coordinates: { lat: 50.85, lng: 4.35 },
      timezone: 'Europe/Brussels',
      method: 'Turkish',
      madhab: 'hanafi',
      highLatitudeRule: 'seventhOfTheNight',
      adhanOffsets: { fajr: 2 },
      iqamaConfig: { fajr: { enabled: true, type: 'offset', minutes: 15 } },
    };

    const config = buildConfigFromSanity(sanityData);
    expect(config.coordinates.lat).toBe(50.85);
    expect(config.madhab).toBe('hanafi');
    expect(config.highLatitudeRule).toBe('seventhOfTheNight');
  });
});
