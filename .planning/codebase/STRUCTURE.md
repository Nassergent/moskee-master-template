# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
moskee-master-template/
├── src/                          # Source code (SSR app)
│   ├── components/               # Astro & React UI components
│   │   ├── home/                 # Homepage-specific cards (Event, Donation, Download, etc.)
│   │   ├── ui/                   # Shared UI components
│   │   │   ├── donation/         # Donation-related (BankQrCard)
│   │   │   ├── education/        # Education/lessons UI (ScheduleGrid, LessonCard, etc.)
│   │   │   └── janazah/          # Janazah banner & procedure steps
│   │   ├── BaseLayout.astro      # Main layout wrapper (SEO, theme, fonts)
│   │   ├── Navigation.astro      # Header nav with menu toggles
│   │   ├── Footer.astro          # Footer (settings-driven)
│   │   ├── Section.astro         # Zebra-striping wrapper
│   │   ├── PortableText.astro    # Sanity rich text renderer
│   │   ├── PrayerManager.astro   # Prayer times display
│   │   └── [...other cards]
│   ├── layouts/                  # Page layouts
│   │   └── BaseLayout.astro      # Main page wrapper
│   ├── pages/                    # File-based routing (Astro)
│   │   ├── index.astro           # Homepage
│   │   ├── over-ons.astro        # About page
│   │   ├── contact.astro         # Contact form page
│   │   ├── doneren.astro         # Donation page
│   │   ├── gebedstijden.astro    # Prayer times page
│   │   ├── lessen.astro          # Lesson programs listing
│   │   ├── janazah.astro         # Janazah information
│   │   ├── diensten.astro        # Services overview
│   │   ├── nieuws.astro          # News listing
│   │   ├── bedankt.astro         # Thank you page (post-donation)
│   │   ├── privacy.astro         # Privacy policy
│   │   ├── diensten/
│   │   │   └── [slug].astro      # Dynamic service detail pages
│   │   ├── nieuws/
│   │   │   └── [slug].astro      # Dynamic news detail pages
│   │   ├── agenda/
│   │   │   ├── index.astro       # Agenda listing
│   │   │   └── [slug].astro      # Dynamic event detail
│   │   ├── api/                  # API endpoints
│   │   │   ├── donate.ts         # Payment creation (POST)
│   │   │   ├── mollie-webhook.ts # Payment webhook (POST)
│   │   │   ├── contact.ts        # Contact form submission (POST)
│   │   │   ├── evenement-aanmelding.ts  # Event registration (POST)
│   │   │   ├── vrijwilligers.ts  # Volunteer form (POST)
│   │   │   └── jobs/
│   │   │       └── reconcile-mollie.ts  # Background job for payment reconciliation
│   │   ├── 404.astro             # Not found page
│   │   └── 500.astro             # Error page
│   ├── lib/                      # Shared utilities & logic
│   │   ├── sanity.ts             # Sanity fetch helpers (primary API)
│   │   ├── hijri.ts              # Islamic calendar computation
│   │   ├── email-templates.ts    # Email HTML template strings
│   │   ├── countdown-ticker.ts   # Countdown timer for events
│   │   ├── security.ts           # CSRF, rate limiting, bot detection
│   │   └── logic/                # Pure business logic (no side effects)
│   │       ├── prayer-engine.ts  # Accurate prayer time calculation
│   │       ├── prayer-engine.test.ts  # 12K prayer engine tests
│   │       ├── prayer-compute.ts # Convert Sanity config to computed times
│   │       ├── education.ts      # Lesson schedule filtering & sorting
│   │       ├── janazah.ts        # Janazah alert logic
│   │       ├── agenda-utils.ts   # Event date formatting
│   │       ├── donation-utils.ts # Donation progress calculations
│   │       ├── payment-validators.ts  # Amount & currency validation
│   │       ├── webhook-validators.ts  # Signature & data validation
│   │       ├── volunteer-validators.ts  # Form validation
│   │       ├── qr-service.ts     # QR code generation
│   │       ├── menu-builder.ts   # Navigation menu from settings
│   │       ├── config.ts         # Site config builder (country, timezone)
│   │       ├── logger.ts         # Structured logging
│   │       ├── image-optimizer.ts  # Image URL building
│   │       ├── media-utils.ts    # Asset URL helpers
│   │       ├── project-utils.ts  # Donation project helpers
│   │       ├── reconcile-utils.ts  # Payment reconciliation
│   │       ├── seo-utils.ts      # SEO alt text sanitization
│   │       └── nav-utils.ts      # Navigation helpers
│   ├── services/                 # External integrations & workflows
│   │   ├── email-service.ts      # Resend email client + sending
│   │   ├── payment-service.ts    # Mollie payment client
│   │   ├── webhook-service.ts    # Webhook handler (Mollie → Sanity)
│   │   ├── event-registration-service.ts  # Event registration workflow
│   │   ├── volunteer-service.ts  # Volunteer form workflow
│   │   └── reconcile-service.ts  # Payment reconciliation job
│   ├── styles/
│   │   └── global.css            # Tailwind v4 config + animations
│   └── middleware.ts             # Request-level CSP, cache, security headers
├── sanity/                       # Sanity CMS schema & configuration
│   ├── lib/
│   │   └── client.ts             # Sanity client setup (read, fresh, write)
│   ├── schema.ts                 # Schema registry (imports all types)
│   └── schemas/                  # Document type definitions
│       ├── settings.ts           # Singleton: site config, theme, menu toggles
│       ├── homePage.ts           # Singleton: hero, badges, CTA
│       ├── homeCards.ts          # Singleton: card variants (event, donation, download, custom)
│       ├── prayerTimes.ts        # Singleton: prayer config + coordinates
│       ├── aboutPage.ts          # Singleton: about page content
│       ├── contactPage.ts        # Singleton: contact form metadata
│       ├── service.ts            # Collection: services (herstellingen, montage, etc.)
│       ├── project.ts            # Collection: donation projects
│       ├── post.ts               # Collection: news articles
│       ├── agendaEvent.ts        # Collection: event entries
│       ├── lessonProgram.ts      # Collection: lesson programs
│       ├── ramadanOverride.ts    # Document: Ramadan schedule override
│       ├── janazahProcedure.ts   # Document: Janazah procedure steps
│       ├── janazahAlert.ts       # Document: Active janazah alert
│       ├── quote.ts              # Collection: quotes (categorie: donaties, etc.)
│       ├── etiquette.ts          # Collection: mosque etiquette rules
│       ├── eventCategorie.ts     # Collection: event category taxonomy
│       ├── eventRegistration.ts  # Document: submitted event registrations
│       └── volunteer.ts          # Document: submitted volunteer applications
├── public/                       # Static assets
│   ├── fonts/                    # Self-hosted fonts (Philosopher, Lato, Amiri)
│   ├── favicon.svg
│   ├── favicon.ico
│   └── robots.txt
├── .planning/
│   └── codebase/                 # Documentation (this location)
├── astro.config.mjs              # Astro configuration (SSR, adapters, integrations)
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies & scripts
└── .env (ignored)                # Runtime env vars (PUBLIC_*, SANITY_*, etc.)
```

## Directory Purposes

**src/components:**
- Purpose: Reusable Astro & React UI building blocks
- Contains: Page-level components, card variants, form wrappers, display helpers
- Key files: `BaseLayout.astro`, `Navigation.astro`, `Footer.astro`, `Section.astro`
- Subfolders: `home/` (homepage-specific), `ui/` (shared UI by domain: donation, education, janazah)

**src/lib/sanity.ts:**
- Purpose: Central Sanity CMS API — fetch helpers + client setup
- Contains: Query functions for every document type (fetchSettings, fetchDiensten, fetchProjecten, etc.)
- Key detail: Uses both `sanityClient` (CDN-cached) and `freshClient` (real-time) based on content type
- Exported to: All pages, components, services

**src/lib/logic/:**
- Purpose: Pure business logic isolated from framework/UI concerns
- Contains: Calculations (prayer times, schedules), validation, transformation
- Key exports: `getEffectiveSchedule()`, `computePrayerTimes()`, `validatePaymentAmount()`, `sortByDay()`
- No side effects: Can be tested in isolation, reused across pages/services

**src/pages/ (Route Structure):**
- Purpose: File-based routing via Astro — each file is a route
- Pattern: `pages/[slug].astro` → `/:slug` endpoint
- Nested: `pages/api/*.ts` → `/api/*` endpoints (server functions)
- Singletons: `index.astro`, `contact.astro`, `doneren.astro` (one-page each)
- Dynamic: `diensten/[slug].astro`, `nieuws/[slug].astro` (prerendered via getStaticPaths)

**src/pages/api/:**
- Purpose: HTTP endpoints for form submissions, payments, webhooks
- Pattern: POST endpoints only (GET returns 302 redirect)
- Security: Rate limiting, CSRF check, signature verification
- Clients: Use `writeClient` for Sanity mutations, `fetchSettings` for config

**src/services/:**
- Purpose: Orchestrate external integrations (Resend, Mollie, Sanity mutations)
- Examples: `email-service.ts` (Resend), `payment-service.ts` (Mollie), `webhook-service.ts` (Mollie → Sanity)
- Dependencies: Services can call other services + logic layer

**sanity/lib/client.ts:**
- Purpose: Sanity client configuration with dual-access pattern
- Exports: `sanityClient` (CDN), `freshClient` (no cache), `writeClient` (mutations), `urlFor()` (image builder)
- Environment: `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `SANITY_WRITE_TOKEN`

**sanity/schemas/:**
- Purpose: GROQ document type definitions (schema registry)
- Naming: Each schema is `[type].ts`, imported into `schema.ts`
- Types: Singletons (settings, homePage) + collections (services, projects, news)
- Validation: Rules defined in schema (required fields, slug uniqueness, etc.)

**src/styles/global.css:**
- Purpose: Tailwind v4 theme definition + global animations
- Pattern: Uses `@theme {}` block for color tokens + CSS custom properties
- Dynamic: Overridden at runtime by BaseLayout via `define:vars`
- No config file: Tailwind v4 requires CSS-only theme definition

**src/middleware.ts:**
- Purpose: Request-level middleware (CSP headers, cache control, security)
- Patterns: Exclude `/admin` from CSP (Sanity Studio needs inline scripts), no-cache for donation pages

## Key File Locations

**Entry Points:**
- `src/pages/index.astro`: Homepage (renders 16K+ lines of critical content)
- `src/pages/[directory]/[slug].astro`: Dynamic detail pages (services, news, agenda)
- `src/pages/api/*.ts`: HTTP endpoints (donations, contact, webhooks)

**Configuration:**
- `astro.config.mjs`: Output mode (server), adapters (Vercel), integrations (React, Sanity)
- `src/middleware.ts`: CSP + cache headers
- `sanity/lib/client.ts`: Sanity project config + image optimization defaults
- `src/lib/logic/config.ts`: Site config builder (builds from settings)

**Core Logic:**
- `src/lib/sanity.ts`: All Sanity queries (primary API surface)
- `src/lib/logic/prayer-engine.ts`: Prayer time calculation (12K test coverage)
- `src/lib/logic/education.ts`: Lesson schedule filtering
- `src/services/webhook-service.ts`: Payment webhook handling + reconciliation

**Testing:**
- `src/lib/logic/prayer-engine.test.ts`: Comprehensive prayer engine tests (Vitest)

## Naming Conventions

**Files:**
- Kebab-case: `src/pages/api/mollie-webhook.ts`, `src/components/home/AangepastCard.astro`
- PascalCase for components: `BaseLayout.astro`, `DonationCard.astro`, `ScheduleGrid.astro`
- Utility files: Lowercase + suffix: `prayer-engine.ts`, `email-templates.ts`, `security.ts`
- Tests: `[name].test.ts` or `[name].spec.ts`

**Directories:**
- Lowercase plural: `src/components/`, `src/services/`, `src/lib/logic/`
- Feature-scoped: `src/components/home/`, `src/components/ui/donation/`
- API scope: `src/pages/api/`

**Exports:**
- Functions: camelCase: `fetchDiensten()`, `getEffectiveSchedule()`, `urlFor()`
- Types: PascalCase: `ScheduleEntry`, `RamadanOverride`, `LessonProgram`
- Constants: UPPER_SNAKE_CASE: `dagVolgorde` (data structure, lowercase for objects)

## Where to Add New Code

**New Feature (Complete Feature):**
- Primary page: `src/pages/[feature].astro` (or nested: `src/pages/[feature]/index.astro`)
- Supporting components: `src/components/[feature]/` or `src/components/ui/[feature]/`
- Business logic: `src/lib/logic/[feature].ts` (pure functions)
- Services: `src/services/[feature]-service.ts` (if external API integration)
- API endpoint: `src/pages/api/[feature].ts` (if POST needed)
- Sanity schema: `sanity/schemas/[feature].ts` + import into `sanity/schema.ts`
- Example: Prayer times → `src/pages/gebedstijden.astro` + `PrayerManager.astro` + `prayer-engine.ts` logic

**New Component/Module:**
- Shared UI: `src/components/ui/[domain]/[ComponentName].astro`
- Page-specific: `src/components/[page]/[ComponentName].astro`
- React interactivity: `src/components/[name].jsx` or wrap in Astro
- Exports: Default export (component) + named exports (helpers, interfaces)

**Utilities/Helpers:**
- Sanity queries: Add to `src/lib/sanity.ts` (export as `fetchX()`)
- Business logic: Create new file in `src/lib/logic/[domain].ts`
- Security checks: Add to `src/lib/security.ts`
- Validators: Add domain-specific `src/lib/logic/[domain]-validators.ts`

**Styling:**
- Global styles: `src/styles/global.css` (@theme block or utility classes)
- Component-scoped: `<style>` block inside `.astro` file
- Tailwind classes: Use in HTML via `class=""` (no CSS-in-JS)

**API Endpoints:**
- New POST route: Create `src/pages/api/[name].ts`
- Structure: Export `POST: APIRoute` handler function
- Flow: Validate input → call service → return JSON
- Security: Add CSRF check, rate limiting if user-facing

## Special Directories

**`.planning/codebase/`:**
- Purpose: Architecture & structure documentation (this location)
- Generated: No (hand-written guides)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**`dist/`:**
- Purpose: Build output (SSR server function + static assets)
- Generated: Yes (by `astro build`)
- Committed: No
- Structure: `dist/client/` (static), `dist/server/` (Node.js functions)

**`.vercel/output/`:**
- Purpose: Vercel build artifact cache
- Generated: Yes (by Vercel CLI or CI)
- Committed: No
- Cleanup: Safe to delete

**`.astro/`:**
- Purpose: Astro internal cache (types, collection metadata)
- Generated: Yes (by Astro)
- Committed: No (excluded via .gitignore)
- Cleanup: `astro sync` regenerates if missing

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No
- Install: Use `npm ci` for reproducible builds

**`public/fonts/`:**
- Purpose: Self-hosted WOFF2 fonts (Philosopher, Lato, Amiri)
- Generated: No (pre-built + committed)
- Committed: Yes
- Preload: In BaseLayout via `<link rel="preload">`

---

*Structure analysis: 2026-02-28*
