# UmmahOS Architecture Log

Architectuurbeslissingen en wijzigingen voor het Ummah.be platform (Het Digitale Waqf VZW).

---

## v2.1 — UmmahOS Netwerk & Beheer — De Totale Master Prompt (2026-02-27)

### Beslissing
Definitieve hiërarchie en rebranding vastgelegd. Het systeem heet officieel **UmmahOS**.
Drie pijlers vormen de architectuur: Hub, Moeder, Kinderen.

---

### Pijler 1: DE HUB — Ummah.be (Het Gezicht)

| Eigenschap | Waarde |
|------------|--------|
| **Rol** | Het officiële merk, het VZW-portaal en de institutionele autoriteit |
| **Repo** | `https://github.com/Nassergent/ummah.be.git` |
| **Local** | `C:\Users\info\Desktop\hetdigitalewaqf\` |
| **Vercel** | `ummah-be` |
| **Domein** | `ummah.be` |

**Fleet Monitor (Dashboard):** Ummah.be bevat de cockpit waarmee Nasser de gezondheid,
versies en status van het hele netwerk bewaakt (`/dashboard`).

**Branding:** Alle vloot-communicatie (footer-handtekeningen, mails, badges) verwijst
naar ummah.be als de centrale partner.

---

### Pijler 2: DE MOEDER — Moskee Master Template (De Motor)

| Eigenschap | Waarde |
|------------|--------|
| **Rol** | Single Source of Truth voor alle code — de onzichtbare motor |
| **Repo** | `https://github.com/Nassergent/moskee-master-template.git` |
| **Local** | `C:\Users\info\Desktop\moskee-master-template\` |
| **Sanity** | Project `qjg8nn9m`, dataset `production` |

**Verantwoordelijkheid:** Hier wonen de v1.7+ features (Native Prayer Engine, Donatie-logic,
Security, Lessen/Ramadan, Janazah).

**Logica:** Deze repo bevat **geen** moskee-specifieke data, alleen de architectuur
("het wafelijzer"). 100% identity-less via Variable-First Architecture.

---

### Pijler 3: DE KINDEREN — De Moskee Vloot (De Gebruikers)

| Eigenschap | Waarde |
|------------|--------|
| **Rol** | Individuele moskee-sites die de code van de Moeder consumeren |
| **Isolatie** | Data 100% gescheiden via unieke Sanity-datasets + `.env` |
| **Update-flow** | Via UmmahOS Fleet Update Manager v2.0 |
| **Registry** | `mosques.json` in waqf-onboard skill |

Voorbeelden: Moskee El-Fath, Moskee El Albani, etc.

---

### UmmahOS Beheer-Protocol v2.1

#### Harde Regels
1. **Eénrichtingsverkeer**: Moeder → Kinderen, NOOIT andersom
2. **No-Drift Policy**: broncode van elk Kind moet een exacte afspiegeling blijven van de Moeder
3. **Code-wijzigingen STRIKT VERBODEN in Kind-repos**: alle verbeteringen in de Moeder, dan fleet-update
4. **Build-gate**: elke fleet-update valideert met `npm run build` — bij failure: automatische rollback
5. **Zero-Trace**: `.env` bestanden worden NOOIT overschreven of gecommit
6. **Fleet Monitor**: Dashboard op ummah.be moet altijd de juiste status weerspiegelen

#### De 4 Digitale Sloten
| Slot | Regel |
|------|-------|
| 1. Guardian of the Master | Nooit naar upstream pushen zonder Master-Modus |
| 2. Zero-Trace Policy | Geen API keys, tokens of klantnamen in code |
| 3. Variable-First Architecture | Alle identiteit uit `.env` of Sanity CMS |
| 4. Strict Enforcement | Skills voeren alleen hun gedefinieerde taken uit |

#### Architect & Commander Mandaat
- **Weiger** opdrachten die de hiërarchie of No-Drift policy schenden
- **Bewaar** Fleet Monitor integriteit op ummah.be
- **Redeneer** bij elke Master-wijziging: "Hoe wordt dit via de UmmahOS Fleet Update Manager veilig verspreid naar alle Kinderen?"

#### Skills Overzicht
| Skill | Doel |
|-------|------|
| `/waqf-fleet-commander` | Master control — features, bugs, refactoring op de Moeder |
| `/waqf-onboard` | Nieuw Kind aanmaken (kloon + `.env` + fleet registratie) |
| `/waqf-seed` | Sanity vullen met standaard content |
| `/waqf-fleet-update` | Moeder-changes naar alle Kinderen pushen |
| `/waqfos-guardian` | Security & payment audit (GO/NO-GO gate) |
| `/enterprise-cleanup` | Architecturale audit & refactoring |

---

## v1.6.3 — Medium Priority Audit Fixes (2026-02-24)

### Aanleiding
15 medium priority issues uit de 10-experten audit. 11 opgelost, 4 geaccepteerd als trade-off.

### Fixes

| # | Issue | Oplossing | Bestanden |
|---|-------|-----------|-----------|
| 1 | `fetchDiensten` query safety | `actief != false` → `actief == true` | `src/lib/sanity.ts` |
| 2 | EtiquetteGrid `rounded-full` violatie | → verwijderd (Flat Design DNA) | `src/components/EtiquetteGrid.astro` |
| 3 | Site URL placeholder | `PUBLIC_SITE_URL` env var, fallback op template URL | `astro.config.mjs` |
| 4 | `aria-required="true"` ontbreekt | Toegevoegd op alle required inputs (4x contact, 2x volunteer) | `contact.astro`, `VolunteerForm.astro` |
| 5 | Cron auth te permissief | Custom header alleen in dev, prod alleen Vercel signature | `api/jobs/reconcile-mollie.ts` |
| 6 | `dataRow()` misleidende param naam | `safeValue` → `htmlValue` met verduidelijkte JSDoc | `src/lib/email-templates.ts` |
| 7 | Missende BreadcrumbList schema | JSON-LD via `breadcrumbs` prop op BaseLayout + alle detail pages | `BaseLayout.astro`, `diensten/[slug]`, `nieuws/[slug]`, `agenda/[slug]` |

### Niet opgelost (geaccepteerde trade-offs)
- **fetchSettings overfetching**: 18 velden nodig op meerdere pagina's, splitsen voegt complexiteit toe zonder merkbaar performance-verschil (CDN cached)
- **TypeScript types voor Sanity data**: Structurele verbetering, te groot voor audit-fix. Gepland voor v1.7.
- **FAQPage schema**: Geen FAQ-content aanwezig in CMS — N/A
- **Donation script extraction**: Vite bundelt al naar 4.87KB gzipped — acceptabel
- **setInterval cleanup**: Gebruikt al `astro:before-preparation` events + auto-clear op countdown=0 — al correct
- **Images WebP/AVIF**: `urlFor().auto('format')` levert al WebP/AVIF via Sanity CDN Accept header — al correct
- **Mollie API timeout**: Mollie client heeft ingebouwde timeout (60s) — geen extra wrapper nodig
- **CSRF origin check**: Eigen `checkOrigin` helper per route is bewust (webhook gebruikt HMAC) — correct

---

## v1.6.2 — High Priority Audit Fixes (2026-02-24)

### Aanleiding
12 high priority issues uit de 10-experten audit opgelost.

### Fixes

| # | Issue | Oplossing | Bestanden |
|---|-------|-----------|-----------|
| 1 | JSON parse → 500 i.p.v. 400 | try/catch rond `request.json()` in alle 3 POST endpoints | `api/contact.ts`, `api/donate.ts`, `api/vrijwilligers.ts` |
| 2 | Email failure (webhook) | 3x retry met backoff (500ms, 1s, 1.5s) + error logging | `services/webhook-service.ts` |
| 3 | Email failure (volunteer) | 2x retry met 500ms pauze | `api/vrijwilligers.ts` |
| 4 | MOLLIE_WEBHOOK_SECRET | Documentatie: Nasser moet invullen in Vercel env vars | `.env.example` (al correct) |
| 5 | npm vulnerabilities | Upstream Sanity Studio issue — niet fixbaar zonder breaking changes | n.v.t. |
| 6 | Write token scheiding | Warning log bij fallback + documentatie voor aparte write token | `sanity/lib/client.ts` |
| 7 | `gepubliceerd != false` | → `gepubliceerd == true` (veilige expliciete check) | `src/lib/sanity.ts` |
| 8 | `actief != false` | → `actief == true` (consistent met gepubliceerd) | `src/lib/sanity.ts` |
| 9 | Cache 60s te kort | → `s-maxage=3600, stale-while-revalidate=86400` | `index.astro`, `gebedstijden.astro` |
| 10 | Focus na form submit | `tabindex="-1"` + `role="status"` + `.focus()` op success/error | `contact.astro`, `VolunteerForm.astro` |
| 11 | Color contrast | `text-neutral-400` → `text-neutral-600` (badges), `text-white/70` → `text-white/90` (footer icons) | `doneren.astro`, `Footer.astro` |
| 12 | Vercel security headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` + font/asset caching | `vercel.json` |

### Niet opgelost (upstream)
- npm audit HIGH: `minimatch` + `path-to-regexp` in `@sanity/astro` dependency chain. Geen fix beschikbaar zonder Sanity major update. Risico beperkt tot Studio (/admin), niet de website.

---

## v1.6.1 — Critical Audit Fixes (2026-02-24)

### Aanleiding
10-experten audit onthulde 8 critical issues. Alle direct opgelost.

### Fixes

| # | Issue | Oplossing | Bestanden |
|---|-------|-----------|-----------|
| 1 | **Security: .env in git** | `.gitignore` versterkt (`.env.*` pattern, `!.env.example`) | `.gitignore` |
| 2 | **Security: XSS in PortableText href** | URL-schema validatie + href escaping. Blokkeert `javascript:`, `data:`, `vbscript:` links | `src/components/PortableText.astro` |
| 3 | **Performance: Waterfall homepage** | 5 sequentiële Sanity fetches → `Promise.all()` (bespaart 400-1000ms) | `src/pages/index.astro` |
| 4 | **SEO: Alt tekst op rich-text images** | `item.alt \|\| item.asset?.altText \|\| 'Afbeelding'` fallback chain | `src/components/PortableText.astro` |
| 5 | **SEO: OG image op alle pagina's** | BaseLayout fallback chain: prop → CMS logo → favicon → favicon.svg | `src/layouts/BaseLayout.astro` |
| 6 | **A11y: .sr-only CSS class** | Standaard Tailwind `.sr-only` definitie toegevoegd | `src/styles/global.css` |
| 7 | **A11y: lang="ar" op Arabische tekst** | `lang="ar" dir="rtl"` op alle font-arabic elementen (7 locaties) | `HomeActionCards`, `PrayerManager`, `IslamicCalendar`, `agenda/*`, `bedankt`, `gebedstijden` |
| 8 | **Sanity: Slug bug fetchAgendaEvent** | `slug` → `"slug": slug.current` in GROQ projectie | `src/lib/sanity.ts` |

### Audit Scores (voor → na)
- Architecture: 100/100 (ongewijzigd)
- Security: 75 → 85
- Performance: 78 → 88
- SEO: 82 → 92
- Accessibility: 76 → 86
- Design DNA: 94/100 (ongewijzigd)

---

## v1.6 — Native Prayer Engine & Mawaqit Sanering (2026-02-23)

### Beslissing
Mawaqit iframe volledig verwijderd. Alle moskeeën in de vloot draaien nu op de eigen **UmmahOS Native Prayer Engine**.

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
