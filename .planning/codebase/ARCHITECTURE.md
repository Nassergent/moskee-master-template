# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Astro 5 + Sanity CMS with Server-Side Rendering (SSR) on Vercel. Multi-tenant SaaS pattern where each mosque instance gets its own Sanity dataset but shares identical codebase. Layered architecture: Sanity (CMS) → Fetch Layer → Logic (Pure) → Components (Astro/React) → Pages.

**Key Characteristics:**
- Server-rendered all pages (`output: 'server'`) on Vercel — no static prerendering
- Sanity CMS is single source of truth for all content, settings, and business logic
- Pure functional logic layer (`src/lib/logic/`) isolated from I/O and side effects
- Dynamic theming (60-30-10 color system) driven entirely from Sanity CMS
- Flat design: NO rounded corners, NO box shadows except badges (enforced in global.css)
- Real-time data via `freshClient` (no CDN) for donations, Ramadan overrides, Janazah alerts
- Cached data via `sanityClient` (CDN) for general content
- API routes handle external integrations: Mollie payments, form submissions, webhooks
- Services layer (`src/services/`) for complex flows: webhook processing, payment reconciliation, email, volunteer management

## Layers

**Sanity CMS (Data Source):**
- Purpose: Single source of truth for all content, configuration, and business logic
- Location: Hosted at `sanity.studio`, embedded at `/admin` via `@sanity/astro`
- Contains: 19 document types (settings, pages, services, agenda, lessons, donations, volunteers, janazah, etc.)
- Depends on: Nothing (external service)
- Used by: All pages and API routes via fetch helpers in `src/lib/sanity.ts`

**Fetch Layer (`src/lib/sanity.ts`):**
- Purpose: Centralized data access with proper client selection (CDN vs fresh)
- Location: `src/lib/sanity.ts`, `sanity/lib/client.ts`
- Contains: 40+ fetch functions (fetchSettings, fetchDiensten, fetchLessonPrograms, etc.)
- Depends on: `@sanity/client`, Sanity CMS
- Used by: All Astro pages and API routes

**Logic Layer (`src/lib/logic/`):**
- Purpose: Pure functions for business logic, independent of I/O
- Location: 23 utility files in `src/lib/logic/`
- Examples:
  - `education.ts`: schedule sorting, category filtering, Ramadan override logic
  - `prayer-compute.ts`: prayer time calculations from Adhan library
  - `config.ts`: site configuration builder
  - `webhook-validators.ts`: HMAC verification, idempotency checks
  - `payment-validators.ts`: Mollie payment validation
  - `date-utils.ts`, `agenda-utils.ts`: date/time formatting
  - `donation-utils.ts`, `project-utils.ts`: donation and project utilities
  - `logger.ts`: structured logging format
  - `qr-service.ts`: QR code generation
  - `menu-builder.ts`: dynamic menu construction from settings
- Depends on: Standard library only
- Used by: Components, pages, API routes, services

**Page Layer (`src/pages/`):**
- Purpose: Astro page components that fetch data and render HTML
- Location: 20+ .astro files in `src/pages/` and subdirectories
- Rendering: All server-rendered (no `export const prerender = true`)
- Examples:
  - `index.astro`: Homepage with hero, prayer card, donations, upcoming events
  - `diensten.astro`, `diensten/[slug].astro`: Services listing and detail
  - `agenda/index.astro`, `agenda/[slug].astro`: Events with registration
  - `lessen.astro`: Lessons with smart filter and schedule
  - `doneren.astro`: Donation page with Mollie integration
  - `contact.astro`: Contact form with submission
  - `gebedstijden.astro`: Prayer times dashboard
  - `janazah.astro`: Janazah procedure and active alerts
  - `nieuws/[slug].astro`: News articles with topic hub integration
  - `over-ons.astro`: About page with sections from CMS
- Depends on: Fetch layer, Logic layer, Components
- Used by: Browser requests

**Component Layer (`src/components/`):**
- Purpose: Reusable Astro and React components for UI
- Location: Organized in `src/components/`, `src/components/home/`, `src/components/ui/education/`, etc.
- Astro Components:
  - `BaseLayout.astro`: Master layout with SEO, theming, fonts, Schema.org
  - `Navigation.astro`: Header with menu toggles from settings
  - `Footer.astro`: Footer with contact info and social links
  - `Section.astro`: Zebra-striping layout component (light-50, light-100, dark variants)
  - `PortableText.astro`: Portable Text renderer for rich content
  - `PrayerManager.astro`: Prayer times display and live update manager
  - Domain components: DonationCard, EtiquetteGrid, AddToCalendar, VolunteerForm
- React Components (`@astrojs/react` integration):
  - `EventRegistrationForm.tsx`: Event registration with party size and validation
  - SmartFilterBar, ScheduleGrid, LessonCard, PracticalInfo: Education UI
  - JanazahBanner, JanazahProcedureSteps: Janazah-specific UI
  - Countdown, LivePrayerCard: Dynamic prayer-related UI
- Depends on: Logic layer, Fetch layer
- Used by: Pages

**API Layer (`src/pages/api/`):**
- Purpose: Server-side endpoints for form submissions, payments, webhooks
- Location: `src/pages/api/` and subdirectories
- Routes:
  - `POST /api/donate`: Initiate Mollie payment, validate amount, rate limit, CSRF
  - `POST /api/mollie-webhook`: Receive Mollie payment callbacks (idempotent, HMAC-verified)
  - `POST /api/contact`: Form submission with Resend email
  - `POST /api/evenement-aanmelding`: Event registration with capacity check
  - `POST /api/vrijwilligers`: Volunteer form submission
  - `POST /api/jobs/reconcile-mollie`: Scheduled job to reconcile payments (Vercel Cron)
- All disable default Astro CSRF checks via `security: { checkOrigin: false }` in astro.config.mjs
- Implement custom origin checks and rate limiting via `src/lib/security.ts`
- Depends on: Services layer, Logic layer, Fetch layer
- Used by: Frontend forms, external webhooks, scheduled jobs

**Services Layer (`src/services/`):**
- Purpose: Complex business logic workflows
- Location: 7 service files
- Key Services:
  - `webhook-service.ts`: Armored webhook processing (idempotency, locking, retry, recovery)
  - `payment-service.ts`: Payment success handling, project updates
  - `reconcile-service.ts`: Payment reconciliation job
  - `email-service.ts`: Email template rendering and sending via Resend
  - `event-registration-service.ts`: Event registration with occupancy checks
  - `volunteer-service.ts`: Volunteer form processing
- Depends on: Sanity write client, Mollie API, Resend API, Logic layer
- Used by: API routes, scheduled jobs

## Data Flow

**Content Rendering Flow:**
1. Browser requests page (e.g., `/diensten/montage`)
2. Astro server renders `src/pages/diensten/[slug].astro`
3. Page calls `fetchDiensten()` from `src/lib/sanity.ts`
4. `fetchDiensten()` queries Sanity with GROQ: `*[_type == "service" && actief == true]`
5. Sanity returns cached (CDN) service documents
6. Page finds matching slug and renders via `BaseLayout` → `Section` → `PortableText`
7. HTML returned to browser

**Dynamic Homepage (Real-Time Components):**
1. Browser requests `/`
2. `index.astro` calls 7 fetch functions in parallel: settings, actueel, homePage, homeCards, agendaEvents, prayer, janazahAlert
3. `fetchSettings()`, `fetchHomeCards()`, `fetchProjecten()`, `fetchActiveJanazahAlert()` use `freshClient` (no CDN, real-time)
4. Other fetches use `sanityClient` (CDN cached)
5. Page computes prayer times via `computePrayerTimesFromSanity()` (pure logic)
6. `PrayerManager` component renders with inline CSS for LCP optimization
7. `HomeCardSlot` renders dynamic card variants (donation, event, download, custom)
8. Cache headers set: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`

**Donation Payment Flow:**
1. User selects project and amount on `/doneren`
2. Form POSTs to `/api/donate` with { amount, projectId, email, frequency }
3. API route `donate.ts`:
   - Checks origin (CSRF)
   - Rate limits via Redis/in-memory
   - Validates amount via `validatePaymentAmount()` logic
   - Detects honeypot field (bot detection)
   - Creates Mollie payment via Mollie API
   - Returns { checkoutUrl } to redirect user
4. User completes payment on Mollie
5. Mollie calls `/api/mollie-webhook` with payment ID
6. Webhook route `mollie-webhook.ts`:
   - Rate limits and validates signature (HMAC timing-safe)
   - Calls `processWebhook(paymentId)` service
7. `webhook-service.ts`:
   - Checks Redis for idempotency (prevent duplicates)
   - Acquires distributed lock (prevent concurrent processing)
   - Fetches payment from Mollie API
   - Updates Sanity project.huidigBedragCents via `writeClient`
   - Marks processed in Redis
   - Sends thank you email via `email-service.ts`
8. User redirected to `/bedankt` success page

**Event Registration Flow:**
1. User fills `EventRegistrationForm` on event detail page
2. Form POSTs to `/api/evenement-aanmelding` with { eventId, name, email, partySize, contact, termsAccepted }
3. API validates event capacity via `fetchAgendaEventRegistrationInfo(eventId)` (freshClient)
4. `event-registration-service.ts`:
   - Checks current occupancy: `math::sum(*[eventRegistration && eventRef._ref == eventId && status != "cancelled"].partySize)`
   - Validates against `registrationMax`
   - Creates eventRegistration document in Sanity
5. Sends confirmation email via `email-service.ts`
6. Returns success response

**Lesson Schedule Logic (Ramadan Override):**
1. Page `lessen.astro` fetches: `fetchLessonPrograms()` + `fetchRamadanOverride()`
2. Calls `getEffectiveSchedule(program.rooster, ramadanOverride)` for each program
3. Pure logic in `education.ts`:
   - If `ramadanOverride.ingeschakeld === true` and `ramadanOverride.rooster` exists:
     - Return `type: 'ramadan'` with Ramadan schedule
   - Else:
     - Filter normal schedule to active entries only
     - Sort by day of week (maandag → zondag)
     - Return `type: 'normal'`
4. Component renders appropriate schedule display

**Prayer Time Computation:**
1. Page fetches `fetchPrayerTimes()` (includes coordinates, method, madhab, offsets)
2. Calls `computePrayerTimesFromSanity(prayerData)` in `prayer-compute.ts`
3. Uses `adhan` library to calculate prayer times for today
4. Returns `{ computedTimes: [...], prayerStatus: { ... } }`
5. `PrayerManager` component renders grid with live countdown via client-side timer

**Settings & Theming:**
1. Every page calls `fetchSettings()` at top level
2. Settings document includes: `mosqueName`, `description`, `logo`, `primaryTheme`, `menuToggles`, `timezone`, `hijriAdjustment`, `payconiqQr`, `iban`, `volunteerTasks`, etc.
3. `BaseLayout` receives settings and:
   - Extracts `primaryTheme` (dropdown: slate-indigo, warm-umber, deep-bordeaux, charcoal-sage)
   - Maps to hex color: `#2F3E6B`, `#4A3728`, `#5B2334`, `#374940`
   - Injects CSS variables in `<style>`: `--theme-primary`, `--theme-accent`, `--theme-base`
   - Uses `color-mix()` to generate light/dark variants
4. All pages inherit themed colors via Tailwind classes: `bg-primary`, `text-accent`, etc.
5. `menuToggles` controls Navigation display: showServices, showLessen, showProjects, showAbout, showMollie

**State Management:**
- No centralized state container (Redux, Zustand, etc.)
- Settings cached at page render time (stale-while-revalidate)
- Prayer times computed once at page render, then updated via client-side timer in `PrayerManager`
- Form state managed by individual React components (`EventRegistrationForm`, `VolunteerForm`)
- Donation cart state in `DonationCard` React component
- No cross-page state — each request fetches fresh data

## Key Abstractions

**Fetch Helpers (`src/lib/sanity.ts`):**
- Purpose: Centralize Sanity queries with proper caching strategy
- Pattern: Exports named async functions (fetchDiensten, fetchSettings, etc.)
- Example:
  ```typescript
  export async function fetchDiensten() {
    try {
      const result = await sanityClient.fetch(`*[_type == "service" && actief == true] | order(volgorde asc) {...}`);
      return result || [];
    } catch (e) {
      console.error('Sanity fetchDiensten error:', e);
      return [];
    }
  }
  ```
- Uses `sanityClient` (CDN) for general content, `freshClient` (no CDN) for real-time data
- All queries include error boundaries and fallback defaults
- Example queries:
  - Services: `*[_type == "service" && actief == true] | order(volgorde asc)`
  - Settings: `*[_id == "settings"][0]` with specific fields only (not full document)
  - Projects: `*[_type == "project" && actief == true] | order(toonOpHomepage desc, _createdAt desc) [0...2]`
  - Occupancy: `math::sum(*[eventRegistration && eventRef._ref == eventId && status != "cancelled"].partySize)`

**Configuration Builder (`src/lib/logic/config.ts`):**
- Purpose: Transform Sanity settings into application config
- Function: `buildSiteConfig(settings) → { locale, timezone, country, mosqueName }`
- Used by: Pages that need structured config (timezone for date formatting, locale for i18n)

**Education Logic (`src/lib/logic/education.ts`):**
- Purpose: Pure functions for lesson schedule and filtering
- Key functions:
  - `getEffectiveSchedule(normalSchedule, ramadanOverride)`: Returns active schedule (normal or Ramadan)
  - `getUniqueCategories(programs)`: Extract and sort categories
  - `shouldShowFilter(programs)`: Boolean to show filter bar
  - `sortByDay(entries)`: Sort schedule entries by weekday
- Interfaces: ScheduleEntry, RamadanEntry, RamadanOverride, EffectiveSchedule, LessonProgram
- Used by: `lessen.astro` page and education components

**Payment Processing (`src/services/payment-service.ts` + `webhook-service.ts`):**
- Purpose: Armored payment flow with idempotency, locking, and recovery
- Pattern: Redis-backed idempotency + distributed locks
- Idempotency key: `${tenantId}:processed:${paymentId}` (mark payment as processed)
- Processing lock: `${tenantId}:processing:${paymentId}` (prevent concurrent processing)
- If Redis unavailable: Hard-fail with 503 (graceful degradation)
- Retry logic: Mollie automatically retries failed webhooks

**Email Templates (`src/lib/email-templates.ts`):**
- Purpose: HTML email templates for confirmations and thank-you messages
- Pattern: Functions that return HTML strings
- Used by: `email-service.ts` to send via Resend API
- Examples: donation confirmation, event registration, volunteer signup

**Security Layer (`src/lib/security.ts`):**
- Purpose: Rate limiting, origin checks, bot detection
- Functions:
  - `checkRateLimit(ip, strategy, limit, window, endpoint)`: Redis or in-memory rate limiting
  - `checkOrigin(request, expectedOrigin)`: CSRF origin verification
  - `isBot(data)`: Honeypot detection
  - `getClientIp(request)`: Extract real IP from X-Forwarded-For
  - `verifyHmacTimingSafe(secret, payload, signature)`: Timing-safe HMAC verification
- Strategies:
  - `hard-fail`: Return 503 if Redis unavailable (critical endpoints like `/api/donate`)
  - `in-memory-fallback`: Use in-memory cache if Redis unavailable (webhooks)

## Entry Points

**Astro Server (Vercel):**
- Location: `astro.config.mjs` with `output: 'server'` and `adapter: vercel()`
- Triggers: HTTP request to any path
- Responsibilities:
  - Route matching (Astro file-based routing)
  - Page rendering via Astro SSR
  - API route handling
  - Middleware execution (via astro.config.mjs integrations)

**Homepage (`src/pages/index.astro`):**
- Location: `src/pages/index.astro`
- Triggers: GET `/`
- Responsibilities:
  - Fetch 7 data sources in parallel
  - Render hero section with dynamic tagline/title from CMS
  - Render prayer card with live countdown
  - Render donation campaigns (top 2 projects)
  - Render upcoming events
  - Render news/actueel section
  - Set cache headers for Vercel

**Dynamic Service Page (`src/pages/diensten/[slug].astro`):**
- Location: `src/pages/diensten/[slug].astro`
- Triggers: GET `/diensten/{slug}` for any active service slug
- Responsibilities:
  - Fetch all services (cached)
  - Find matching slug
  - Render header, content, practical info
  - Return 302 redirect if slug not found

**Donation API (`src/pages/api/donate.ts`):**
- Location: `src/pages/api/donate.ts`
- Triggers: POST `/api/donate` with JSON body
- Responsibilities:
  - CSRF validation
  - Rate limiting
  - Amount validation (€1–€5000)
  - Create Mollie payment
  - Return checkout URL or error

**Mollie Webhook (`src/pages/api/mollie-webhook.ts`):**
- Location: `src/pages/api/mollie-webhook.ts`
- Triggers: POST from Mollie when payment status changes
- Responsibilities:
  - HMAC signature verification
  - Idempotency check
  - Distributed locking
  - Payment status update
  - Project amount update
  - Email sending
  - Return 200 OK (idempotent)

## Error Handling

**Strategy:** Graceful degradation with fallback defaults

**Patterns:**

1. **Fetch Error Handling:**
   ```typescript
   export async function fetchDiensten() {
     try {
       const result = await sanityClient.fetch(`...`);
       return result || [];
     } catch (e) {
       console.error('Sanity fetchDiensten error:', e);
       return [];
     }
   }
   ```
   - Always return default value (empty array, null, etc.)
   - Log error but don't throw
   - Allow pages to render with missing data

2. **API Route Error Handling:**
   ```typescript
   try {
     // Main logic
   } catch (error) {
     console.error('[endpoint] Error:', error);
     return new Response(JSON.stringify({ error: 'User-friendly message' }), {
       status: 400,
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```
   - Catch all errors at top level
   - Return JSON with status code
   - Log stack traces for debugging

3. **Webhook Processing Error Handling:**
   - Redis unavailable → 503 Service Unavailable (Mollie retries)
   - HMAC verification fails → 401 Unauthorized
   - Invalid payment ID → 400 Bad Request
   - Payment already processed → 200 OK (idempotent)
   - Unexpected error → 500 Internal Server Error (Mollie retries)

4. **Validation Errors:**
   - Use pure logic functions (`validatePaymentAmount`, `volunteer-validators.ts`)
   - Return structured response: `{ valid: boolean, error?: string, value?: T }`
   - API routes check and return 400 with error message

5. **Page Not Found:**
   - Custom `src/pages/404.astro` for 404 errors
   - Custom `src/pages/500.astro` for server errors
   - Dynamic routes redirect: if slug not found, `return Astro.redirect('/fallback')`

## Cross-Cutting Concerns

**Logging:**
- Approach: Structured logging with context and timestamps
- Function: `formatLog(level, event, context, error)` in `src/lib/logic/logger.ts`
- Output format: `[timestamp] [level] [context] [event] [error message]`
- Used by: API routes and services for debugging and monitoring
- Example:
  ```typescript
  log('info', 'webhook_received', { paymentId: 'tr_123' });
  log('error', 'webhook_error', { step: 'idempotency_check' }, redisErr);
  ```

**Validation:**
- Approach: Pure logic functions that return structured validation results
- Functions:
  - `validatePaymentAmount(amount)`: Returns `{ valid, error?, amount? }`
  - `isValidPaymentId(id)`: Returns boolean
  - Volunteer validators, event registration validators
- Used by: API routes before business logic execution

**Authentication:**
- Approach: No user login system. All pages public. API routes protected via:
  - CSRF origin check
  - Rate limiting (IP-based)
  - Honeypot bot detection
  - HMAC signature (webhooks only)
- No session state or JWT tokens

**Authorization:**
- Approach: No role-based access control (public mosque website)
- All content managed via Sanity CMS publish/draft toggles
- CMS access controlled by Sanity project permissions

**Rendering Strategy:**
- Approach: Server-side rendering on Vercel (no static prerendering)
- Every request fetches fresh data from Sanity
- Cache headers set per-page for CDN caching
- Example: Homepage sets `s-maxage=60, stale-while-revalidate=300`
- Real-time data (donations, Ramadan overrides) uses `freshClient` (no CDN)

**Image Optimization:**
- Approach: Sanity Image Pipeline with Tailwind CSS
- Function: `urlFor(source).width(800).height(500).fit('crop').auto('format').quality(80).url()`
- Features:
  - Automatic WebP/AVIF based on Accept header
  - Responsive widths (400, 600, 800, 1200)
  - Quality 80 by default (balance size vs quality)
  - `fit('crop')` with hotspot support
- Used by: All image-rendering components and pages

**SEO:**
- Approach: Schema.org structured data + meta tags
- Functions: `sanitizeAlt()` in `seo-utils.ts` for alt text generation
- Schema types:
  - HomePage: Mosque schema
  - Event: Event schema with dateTime, location
  - Article: Not implemented (news posts are generic)
  - BreadcrumbList: For detail pages
- Meta tags in BaseLayout:
  - og:title, og:description, og:image (for social sharing)
  - canonical URL
  - Twitter Card
  - Favicon (from Sanity or fallback)

**Analytics:**
- Approach: External analytics via Vercel Web Analytics (configured separately)
- Telemetry ping script: `scripts/telemetry-ping.js` (optional)
- No client-side Google Analytics or tracking pixels in main codebase

**Email:**
- Approach: Resend API for transactional emails
- Service: `src/services/email-service.ts`
- Templates: HTML generated in `src/lib/email-templates.ts`
- Uses: Donation confirmation, event registration, volunteer signup
- Token: `RESEND_API_KEY` in `.env`

**Multi-Tenancy:**
- Approach: Each mosque instance has own Sanity dataset
- Configuration: `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` in `.env`
- Webhook isolation: `${tenantId}:processed:${paymentId}` in Redis keys
- No code changes needed per mosque — only `.env` differs

---

*Architecture analysis: 2026-02-28*
