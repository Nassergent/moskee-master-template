/**
 * sanity.test.ts — Sanity fetch wrapper tests
 *
 * Coverage:
 * SAN-01: fetchSettings returns settings object
 * SAN-02: fetchSettings returns null on error (graceful fallback)
 * SAN-03: fetchProjecten returns project array
 * SAN-04: fetchProjecten returns empty array on error
 * SAN-05: fetchQuote returns random quote
 * SAN-06: fetchQuote returns null when no quotes found
 * SAN-07: fetchDiensten returns services array
 * SAN-08: fetchAgendaEvents returns events array
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Sanity Client ──

const mockFetch = vi.fn();

vi.mock('../../sanity/lib/client', () => ({
  sanityClient: { fetch: (...args: any[]) => mockFetch(...args) },
  freshClient: { fetch: (...args: any[]) => mockFetch(...args) },
  urlFor: vi.fn(),
}));

vi.mock('./logic/logger', () => ({
  formatLog: (...args: any[]) => JSON.stringify(args),
}));

// ── Tests ──

describe('Sanity fetch helpers', () => {
  let sanityModule: typeof import('./sanity');

  beforeEach(async () => {
    vi.clearAllMocks();
    sanityModule = await import('./sanity');
  });

  describe('fetchSettings()', () => {
    it('SAN-01: returns settings object on success', async () => {
      const mockSettings = { mosqueName: 'Test Moskee', email: 'test@moskee.be' };
      mockFetch.mockResolvedValueOnce(mockSettings);

      const result = await sanityModule.fetchSettings();
      expect(result).toEqual(mockSettings);
      expect(result?.mosqueName).toBe('Test Moskee');
    });

    it('SAN-02: returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sanityModule.fetchSettings();
      expect(result).toBeNull();
    });
  });

  describe('fetchProjecten()', () => {
    it('SAN-03: returns project array on success', async () => {
      const mockProjects = [
        { _id: 'p1', titel: 'Ramadan', doelbedrag: 5000, huidigBedragCents: 250000, actief: true },
        { _id: 'p2', titel: 'Moskee Bouw', doelbedrag: 50000, huidigBedragCents: 0, actief: true },
      ];
      mockFetch.mockResolvedValueOnce(mockProjects);

      const result = await sanityModule.fetchProjecten();
      expect(result).toHaveLength(2);
      expect(result[0].titel).toBe('Ramadan');
    });

    it('SAN-04: returns empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Sanity unavailable'));

      const result = await sanityModule.fetchProjecten();
      expect(result).toEqual([]);
    });
  });

  describe('fetchQuote()', () => {
    it('SAN-05: returns a random quote', async () => {
      const mockQuotes = [
        { _id: 'q1', tekst: 'Test quote', bron: 'Hadith' },
      ];
      mockFetch.mockResolvedValueOnce(mockQuotes);

      const result = await sanityModule.fetchQuote('donaties');
      expect(result).toBeDefined();
      expect(result?.tekst).toBe('Test quote');
    });

    it('SAN-06: returns null when no quotes found', async () => {
      mockFetch.mockResolvedValueOnce([]);

      const result = await sanityModule.fetchQuote('donaties');
      expect(result).toBeNull();
    });
  });

  describe('fetchDiensten()', () => {
    it('SAN-07: returns services array', async () => {
      const mockServices = [
        { _id: 's1', titel: 'Koranles', slug: 'koranles', volgorde: 1 },
      ];
      mockFetch.mockResolvedValueOnce(mockServices);

      const result = await sanityModule.fetchDiensten();
      expect(result).toHaveLength(1);
      expect(result[0].titel).toBe('Koranles');
    });
  });

  describe('fetchAgendaEvents()', () => {
    it('SAN-08: returns events array', async () => {
      const mockEvents = [
        { _id: 'e1', titel: 'Iftar', slug: 'iftar', startDatum: '2026-03-15T18:00:00Z' },
      ];
      mockFetch.mockResolvedValueOnce(mockEvents);

      const result = await sanityModule.fetchAgendaEvents();
      expect(result).toHaveLength(1);
      expect(result[0].titel).toBe('Iftar');
    });
  });
});
