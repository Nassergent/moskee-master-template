/**
 * donation-utils.test.ts — Donation Utility Tests
 *
 * Coverage:
 * DONATE-01: parseDonationParams() extracts bedrag + bestemming
 * DONATE-02: parseDonationParams() detects demo=true flag
 * DONATE-03: parseDonationParams() returns isDemo=false when demo param absent
 * DONATE-04: calculateDonationProgress() basic percentage
 * DONATE-05: calculateDonationProgress() caps at 100%
 * DONATE-06: calculateDonationProgress() isUrgent at 80-99%
 * DONATE-07: calculateDonationProgress() isComplete at 100%
 * DONATE-08: calculateDonationProgress() handles zero goal
 * DONATE-09: slugify() converts text to slug
 */

import { describe, it, expect } from 'vitest';
import { parseDonationParams, calculateDonationProgress, slugify } from './donation-utils';

describe('parseDonationParams()', () => {
  it('DONATE-01: extracts bedrag and bestemming from URL', () => {
    const url = new URL('https://moskee.be/bedankt?bedrag=25.00&bestemming=Ramadan');
    const result = parseDonationParams(url);
    expect(result.bedrag).toBe('25.00');
    expect(result.bestemming).toBe('Ramadan');
  });

  it('DONATE-02: detects demo=true flag', () => {
    const url = new URL('https://moskee.be/bedankt?bedrag=10.00&bestemming=Test&demo=true');
    const result = parseDonationParams(url);
    expect(result.isDemo).toBe(true);
  });

  it('DONATE-03: returns isDemo=false when demo param is absent', () => {
    const url = new URL('https://moskee.be/bedankt?bedrag=10.00&bestemming=Test');
    const result = parseDonationParams(url);
    expect(result.isDemo).toBe(false);
  });
});

describe('calculateDonationProgress()', () => {
  it('DONATE-04: calculates correct percentage', () => {
    const result = calculateDonationProgress(5000, 100); // 50 EUR of 100 EUR
    expect(result.percentage).toBe(50);
    expect(result.huidigEuros).toBe(50);
    expect(result.remaining).toBe(50);
  });

  it('DONATE-05: caps percentage at 100%', () => {
    const result = calculateDonationProgress(15000, 100); // 150 EUR of 100 EUR
    expect(result.percentage).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it('DONATE-06: marks isUrgent between 80-99%', () => {
    const result = calculateDonationProgress(8500, 100); // 85%
    expect(result.isUrgent).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('DONATE-07: marks isComplete at 100%', () => {
    const result = calculateDonationProgress(10000, 100); // 100%
    expect(result.isComplete).toBe(true);
    expect(result.isUrgent).toBe(false);
  });

  it('DONATE-08: handles zero goal gracefully', () => {
    const result = calculateDonationProgress(5000, 0);
    expect(result.percentage).toBe(0);
    expect(result.remaining).toBe(0);
  });
});

describe('slugify()', () => {
  it('DONATE-09: converts text to lowercase slug', () => {
    expect(slugify('Algemene Sadaqa')).toBe('algemene-sadaqa');
    expect(slugify('Nieuwe Moskee Bouw')).toBe('nieuwe-moskee-bouw');
  });
});
