/**
 * prayer-compute.ts — Orchestrates prayer time computation from Sanity data
 *
 * Compartiment: Logic (pure, no side effects)
 * Extracts the prayer engine computation that was previously in PrayerManager.astro
 */

import {
  isEngineConfigComplete,
  buildConfigFromSanity,
  computeFullPrayerTimes,
  getPrayerStatus,
  type ComputedPrayerTimes,
  type PrayerStatus,
} from './prayer-engine';

interface PrayerComputeResult {
  computedTimes: ComputedPrayerTimes | null;
  prayerStatus: PrayerStatus | null;
}

/**
 * Compute prayer times and status from Sanity prayer config.
 * Pure function — takes prayer data, returns computed result.
 */
export function computePrayerTimesFromSanity(prayer: any): PrayerComputeResult {
  if (!isEngineConfigComplete(prayer)) {
    return { computedTimes: null, prayerStatus: null };
  }

  try {
    const config = buildConfigFromSanity(prayer);
    const now = new Date();
    const computedTimes = computeFullPrayerTimes(now, config, prayer.jumuahShifts || []);
    const prayerStatus = getPrayerStatus(now, computedTimes);
    return { computedTimes, prayerStatus };
  } catch (e) {
    console.error('Prayer engine computation failed:', e);
    return { computedTimes: null, prayerStatus: null };
  }
}
