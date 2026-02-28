# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Layered SSR architecture with headless CMS-driven content

**Key Characteristics:**
- Server-side rendering (Astro `output: 'server'`)
- Sanity CMS as single source of truth for all content & configuration
- Flat design system with 60-30-10 dynamic color theming
- API routes handle payments (Mollie), webhooks, registrations, and form submissions
- Pure logic layer separated from components for testability
- Security-first approach: CSP headers, CSRF validation, rate limiting, HMAC webhooks

## Layers

**Presentation (Components):**
- Purpose: Render UI with dynamic data from parent pages
- Location: `src/components/`, `src/components/home/`, `src/components/ui/`
- Contains: Astro components, React client-side helpers
- Depends on: `src/lib/sanity` (fetch helpers), `src/lib/logic/*` (pure functions), BaseLayout
- Used by: Page routes in `src/pages/`

**Page Routes (Routes):**
- Purpose: Entry points for user-facing pages and API endpoints
- Location: `src/pages/` (Astro file-based routing)
- Contains: Homepage, detail pages (diensten, nieuws, agenda), forms (contact, donations), error pages
- Depends on: Components, Sanity fetchers, services, logic utilities
- Used by: Browser navigation, form submissions

**API Layer (Server Endpoints):**
- Purpose: Handle form submissions, payment processing, webhooks, data mutations
- Location: `src/pages/api/`
- Contains: `donate.ts`, `contact.ts`, `mollie-webhook.ts`, `vrijwilligers.ts`, `evenement-aanmelding.ts`
- Depends on: Services, security utilities, validators, Sanity write client
- Used by: Frontend forms, Mollie payment gateway

**Data Access (Sanity Integration):**
- Purpose: Fetch and mutate content from Sanity CMS
- Location: `src/lib/sanity.ts` (fetch helpers), `sanity/lib/client.ts` (clients)
- Contains: Query builders, image optimization, client configuration
- Depends on: @sanity/client, @sanity/image-url
- Used by: All pages, services, API routes

**Business Logic (Pure Functions):**
- Purpose: Non-side-effect computations isolated from components and frameworks
- Location: `src/lib/logic/`
- Contains: Prayer time calculation, education schedule filtering, payment validation, Janazah logic, QR generation
- Depends on: Only data structures and external libraries (hijri, qrcode, etc.)
- Used by: Pages, components, services, API routes

**Services (Cross-Cutting Concerns):**
- Purpose: Handle external integrations and complex workflows
- Location: `src/services/`
- Contains: Email templates & delivery, payment/donation handling, webhook verification, volunteer management
- Depends on: Sanity clients, logic layer, external APIs (Resend, Mollie)
- Used by: API routes, pages

**Layout & Styling:**
- Purpose: Global structure and theming
- Location: `src/layouts/BaseLayout.astro`, `src/styles/global.css`
- Contains: HTML skeleton, SEO setup, dynamic color injection, font definitions
- Depends on: Sanity settings for theme colors & logos
- Used by: All pages

**Middleware & Security:**
- Purpose: Request-level validation and response headers
- Location: `src/middleware.ts`
- Contains: CSP configuration, cache control rules, security headers
- Depends on: Astro middleware API
- Used by: All routes

## Data Flow

**Homepage Rendering:**

1. Browser requests `/`
2. `src/pages/index.astro` executes (server-side)
3. Parallel fetch from Sanity: settings, actueel posts, homePage singleton, homeCards, agenda, prayer times, janazah alert
4. `computePrayerTimesFromSanity()` + `fetchIslamicDays()` compute dynamic data
5. Components render with fetched data
6. BaseLayout wraps with SEO, dynamic theme colors (from settings.primaryTheme)
7. HTML returned with Cache-Control: `s-maxage=60` for fast revalidation
8. Browser receives fully-rendered page

**Donation Flow:**

1. User fills form on `/doneren` page
2. Form submits POST to `/api/donate` with amount, project, donor info
3. `donate.ts` validates:
   - CSRF origin check (`checkOrigin()`)
   - Rate limiting per IP (`checkRateLimit()`)
   - Bot detection honeypot (`isBot()`)
   - Payment amount validation (`validatePaymentAmount()`)
4. Mollie client creates payment redirect
5. User completes payment with Mollie
6. Mollie webhook calls `/api/mollie-webhook` (HMAC verified)
7. `webhook-service.ts` reconciles transaction: updates Sanity project `huidigBedragCents`
8. Database job `/api/jobs/reconcile-mollie` runs periodically for missed webhooks

**Event Registration:**

1. User submits event registration on agenda event detail page
2. POST to `/api/evenement-aanmelding` with attendee info
3. `event-registration-service.ts` creates Sanity document + sends confirmation email
4. Email template renders via `src/lib/email-templates.ts`
5. Resend API sends email
6. User receives confirmation link

**State Management:**

- **Content state:** Sanity CMS (single source of truth)
- **Theme state:** Settings singleton in Sanity → injected as CSS custom properties into BaseLayout
- **Payment state:** Project documents in Sanity track `huidigBedragCents` (updated by webhook)
- **Dynamic dates:** Computed at request-time (prayer times, Ramadan overrides, Hijri calendar)
- **Cache state:** Vercel cache headers control revalidation per route

## Key Abstractions

**Sanity Client Pattern:**
- Purpose: Separate read (CDN-cached) from fresh (real-time) queries
- Examples: `sanityClient` (useCdn: true), `freshClient` (useCdn: false), `writeClient` (mutations)
- Location: `sanity/lib/client.ts`
- Pattern: Dual-client approach — fast reads for static content, direct API for real-time data (donations, webhook reconciliation)

**Prayer Engine:**
- Purpose: Calculate accurate prayer times based on coordinates, method, madhab
- Location: `src/lib/logic/prayer-engine.ts`
- Pattern: Pure function that takes config + date, returns prayer times object
- Test file: `src/lib/logic/prayer-engine.test.ts` (12K test suite)

**Education Schedule Logic:**
- Purpose: Switch between normal lesson rooster and Ramadan override, smart filtering
- Location: `src/lib/logic/education.ts`
- Exports: `getEffectiveSchedule()`, `sortByDay()`, `capitalizeDag()`
- Pattern: No side effects — pure transformation of schedule data

**Dynamic Color System:**
- Purpose: 60-30-10 theming from Sanity dropdown + CSS color-mix()
- Location: `src/layouts/BaseLayout.astro` (color injection), `src/styles/global.css` (@theme block)
- Pattern: Map settings.primaryTheme to hex color → define:vars → color-mix() generates variants
- Variants: `--theme-primary-light`, `--theme-primary-dark`, `--theme-accent-hover`

**Image Optimization:**
- Purpose: Serve WebP/AVIF via Sanity CDN, prevent oversized downloads
- Location: `src/lib/logic/image-optimizer.ts`, `sanity/lib/client.ts` (urlFor)
- Pattern: `urlFor(image).width(1200).auto('format').quality(80)`
- Used in: Hero images, project cards, donation campaigns

**Email Template System:**
- Purpose: Render email HTML with variables, send via Resend
- Location: `src/lib/email-templates.ts` (template strings), `src/services/email-service.ts` (Resend wrapper)
- Pattern: Template function returns HTML string with interpolated values

## Entry Points

**Homepage (`src/pages/index.astro`):**
- Triggers: GET /
- Responsibilities: Fetch homepage config, render hero + action cards + prayer manager + janazah banner + actueel posts
- Dependencies: All Sanity fetchers, PrayerManager component, HomeCardSlot variants

**Dynamic Service Page (`src/pages/diensten/[slug].astro`):**
- Triggers: GET /diensten/:slug (e.g., /diensten/herstellingen)
- Responsibilities: Fetch service by slug, render detail page with rich content
- Exports: `getStaticPaths()` for prerendering via Astro static generation

**Donation Page (`src/pages/doneren.astro`):**
- Triggers: GET /doneren
- Responsibilities: Render donation form, fetch active projects, display progress bars
- Dependencies: Project fetches, form component

**Donation API (`src/pages/api/donate.ts`):**
- Triggers: POST /api/donate with `{ amount, projectId, donorEmail, donorName }`
- Responsibilities: Validate input, create Mollie payment, return redirect URL
- Security: CSRF check, rate limit, bot detection
- Returns: `{ success: true, checkoutUrl: "https://mollie.com/..." }`

**Mollie Webhook (`src/pages/api/mollie-webhook.ts`):**
- Triggers: POST from Mollie payment gateway (HMAC-signed)
- Responsibilities: Verify signature, extract payment data, delegate to webhook-service
- Returns: 200 OK for success, 401 for invalid signature

**Contact Form API (`src/pages/api/contact.ts`):**
- Triggers: POST /api/contact with name, email, message
- Responsibilities: Validate email, send confirmation to admin + user, create Sanity document
- Security: Rate limit, bot detection

**Prayer Times Singleton (`src/pages/gebedstijden.astro`):**
- Triggers: GET /gebedstijden
- Responsibilities: Fetch prayerTimes config, compute times for today, render grid
- Caching: s-maxage=300 (revalidate every 5 minutes)

**Admin Studio Proxy (`/admin`):**
- Triggers: GET /admin
- Responsibilities: Proxy to embedded Sanity Studio via @sanity/astro integration
- Bypasses: Middleware CSP (studio needs inline scripts)

## Error Handling

**Strategy:** Try-catch with fallback nulls + error logging

**Patterns:**
- All Sanity fetch helpers catch errors, log to console, return empty array/null
- Example: `fetchDiensten()` returns `[]` on error, pages handle gracefully
- API routes return 400/429/401 JSON with error messages
- Prayer engine falls back to computed times if Sanity data missing
- Missing images: use placeholder or logo fallback (never break layout)

## Cross-Cutting Concerns

**Logging:**
- Console-based in dev
- Structured logging via `src/lib/logic/logger.ts` (timestamp + context)
- Webhook verification logs signature validation results

**Validation:**
- Input validation in API routes (amount range, email format, phone format)
- Dedicated validators: `src/lib/logic/payment-validators.ts`, `src/lib/logic/volunteer-validators.ts`
- Honeypot field for bot detection (`isBot()` in security.ts)

**Authentication:**
- No traditional auth (read-only public site)
- Volunteer form: rate-limited by IP + honeypot
- Webhook: HMAC signature verification (Mollie secret)
- Admin access: via Sanity Studio (managed by Sanity)

**Internationalization:**
- Dutch (nl) as primary language (hardcoded in layout & components)
- Arabic support for prayer times, quotes, event names (`tekstArabisch`, `naamArabisch` fields in Sanity)
- Font support: Philosopher (headings) + Lato (body) + Amiri (Arabic)
- Timezone handling via Sanity `timezone` setting + adhanOffsets

---

*Architecture analysis: 2026-02-28*
