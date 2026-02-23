# WaqfOS Architecture Log

Architectuurbeslissingen en wijzigingen voor Het Digitale Waqf platform.

---

## v1.6 — Native Prayer Engine & Mawaqit Sanering (2026-02-23)

### Beslissing
Mawaqit iframe volledig verwijderd. Alle moskeeën in de vloot draaien nu op de eigen **WaqfOS Native Prayer Engine**.

### Motivatie
- **Volledige designvrijheid**: geen embedded iframe met oncontroleerbare stijlen
- **Vendor-onafhankelijk**: geen afhankelijkheid van externe dienst (Mawaqit API uptime)
- **SEO**: gebedstijden nu direct in HTML + JSON-LD (iframe was niet indexeerbaar)
- **Performance**: geen externe iframe load (~2-3s), engine berekent in <5ms server-side
- **Multi-moskee schaalbaar**: elke moskee configureert eigen coordinates/method/madhab via Sanity

### Technische Implementatie

**Compartiment-Model gerespecteerd:**

| Compartiment | Bestand | Rol |
|---|---|---|
| LOGICA | `src/lib/logic/prayer-engine.ts` | 8 pure functies, `adhan` library, timezone-aware |
| DATA | `sanity/schemas/prayerTimes.ts` | Singleton met verplichte velden (coordinates, timezone, method, madhab) |
| UI | `src/components/ui/PrayerGrid.astro` | SSR, geen JS |
| UI | `src/components/ui/LivePrayerCard.astro` | SSR + countdown script (<2KB) |
| ORCHESTRATIE | `src/components/PrayerManager.astro` | Combineert engine + UI |

**Verwijderd:**
- `mawaqitSlug` veld uit Sanity schema
- `useNativePrayerEngine` toggle (niet meer nodig)
- Mawaqit iframe + skeleton loader
- CSP `frame-src` voor mawaqit.net
- `dns-prefetch` voor mawaqit.net
- Alle teksten "via Mawaqit" / "Powered by Mawaqit"

**Toegevoegd:**
- `adhan` npm package (~15KB gzipped)
- 38 unit tests (vitest): Brussels, DST, high latitude, iqama, passthrough
- Cache headers: `s-maxage=3600, stale-while-revalidate=86400`
- JSON-LD structured data met berekende gebedstijden
- Seed script met standaard engine config (Gent, MWL, Shafi)

### Jumu'ah Strategie (Nasser's Wet)
Vrijdaggebed (Jumu'ah) blijft **CMS-managed**. Dit is bewust:
- Jumu'ah tijden zijn moskee-specifiek en niet wiskundig te berekenen
- Nasser (CEO) bepaalt deze content per moskee
- Engine berekent alleen de 5 dagelijkse gebeden

### Fallback
Als `coordinates`, `timezone` of `method` ontbreekt in Sanity, toont de UI een admin-waarschuwing met instructies om de config aan te vullen. Geen Mawaqit fallback meer.

### Impact op Vloot
Elke nieuwe moskee krijgt via het seed script automatisch:
- Gent coördinaten (51.05, 3.73) als startpunt
- MWL berekeningsmethode
- Europe/Brussels timezone
- Iqama offset: 15 min (Maghrib: 5 min)

Admin past dit aan naar de werkelijke moskee-locatie bij onboarding.

---
