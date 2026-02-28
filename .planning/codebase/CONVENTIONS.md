# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Kebab-case for component files: `Navigation.astro`, `Section.astro`, `PrayerGrid.astro`
- Kebab-case for utility/service files: `prayer-engine.ts`, `payment-validators.ts`, `webhook-service.ts`
- Test files append `.test.ts`: `prayer-engine.test.ts`, `webhook-service.test.ts`, `webhook-validators.test.ts`
- API routes use kebab-case: `mollie-webhook.ts`, `evenement-aanmelding.ts`, `vrijwilligers.ts`
- Directories use kebab-case: `src/lib/logic`, `src/pages/api`, `sanity/schemas`

**Functions:**
- Camel case: `computeAdhanTimes()`, `validatePaymentAmount()`, `fetchSettings()`, `buildVisibleMenuItems()`
- Validation functions: `validate*` prefix (e.g., `validatePaymentAmount()`, `validateIban()`)
- Type guard functions: `is*` or `is*Valid` prefix (e.g., `isValidPaymentId()`, `isSanityImageAsset()`)
- Utility/helper functions: `get*`, `build*`, `format*`, `parse*`, `calculate*` prefixes
- Internal/private logic: no underscore prefix; rely on module exports to signal public API

**Variables:**
- Camel case throughout: `mollieKey`, `paymentId`, `tenantId`, `currentPrayer`, `secondsUntilNext`
- Constants in `UPPER_SNAKE_CASE`: `PRAYER_NAMES`, `PAYMENT_LIMITS`, `SEPA_COUNTRIES`, `SENSITIVE_KEYS`
- Interface/record instances: descriptive camelCase (e.g., `adhanTimes`, `iqamaConfig`, `prayerSettings`)

**Types:**
- PascalCase for interfaces and types: `PrayerEngineConfig`, `ComputedPrayerTimes`, `ValidationResult`, `LogContext`
- Union types use PascalCase: `LogLevel = 'info' | 'warn' | 'error'`
- Type suffixes clarify intent: `*Result` (validation/computation), `*Config` (configuration), `*Entry` (object shape)
- Discriminated unions with `type` field: `iqamaConfig.type: 'offset' | 'fixed'`

## Code Style

**Formatting:**
- No explicit formatter config (ESLint/Prettier not installed)
- Consistent indentation: 2 spaces (inferred from codebase)
- Line length: practical; most lines 80-100 characters
- Semicolons: required (standard TypeScript/JavaScript)
- Trailing commas in multi-line objects/arrays: present in most files

**Linting:**
- No active linting in package.json
- Astro's built-in strict TypeScript (tsconfig: `extends: "astro/tsconfigs/strict"`)
- JSX mode: `jsx: "react-jsx"` with `jsxImportSource: "react"`
- Type checking enabled by `@astrojs/check`

**Comments and Block Structure:**
- Divider comments use `// ── Section Name ──` style (two dashes on each side)
- File headers include doc blocks for module purpose
- Comments precede logical sections within functions
- JSDoc (triple-slash comments) used for exported functions (see examples in `prayer-engine.ts`, `webhook-validators.ts`)

## TypeScript Usage

**Strict Mode:**
- `tsconfig.json` extends `astro/tsconfigs/strict`
- Strict null checks enforced
- All exported functions have explicit return types
- Interface/type annotations on all function parameters and return types

**Type Definitions:**
- Named interfaces for all data shapes: `interface ComputedPrayerTimes`, `interface LogContext`
- Readonly record types: `Record<PrayerName, string>` for maps
- Discriminated union types: `type IqamaConfigEntry = { type: 'offset'; minutes: number } | { type: 'fixed'; time: string }`
- Generic types used sparingly; explicit types preferred for clarity

**Enums vs Union Types:**
- Union types preferred over enums: `type LogLevel = 'info' | 'warn' | 'error'`
- Exported constants for iteration: `export const PRAYER_NAMES: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']`

## Import Organization

**Order:**
1. Built-in Node/Web APIs (`crypto`, `TextEncoder`, etc.)
2. Package imports (npm): `import { describe, it, expect } from 'vitest'`
3. Sanity client: `import { sanityClient, freshClient, urlFor } from './client'`
4. Local imports (src/): `import { formatLog } from '../lib/logic/logger'`
5. Type imports: `import type { LogContext } from '../lib/logic/logger'`

**Path Aliases:**
- No @ aliases configured; relative paths used throughout
- Import from `../../sanity/lib/client` (absolute from project root)
- Import from `../lib/sanity` (relative when inside src/)

**Re-exports:**
- `src/lib/sanity.ts` re-exports Sanity clients: `export { sanityClient, freshClient, urlFor }`
- Does NOT re-export `writeClient` (server-only; imported directly from `sanity/lib/client`)

## Module Organization

**Pure Logic Compartment (`src/lib/logic/`):**
- Files contain only pure functions: no side effects, no I/O, no env vars
- Examples: `prayer-engine.ts`, `payment-validators.ts`, `agenda-utils.ts`
- Fully testable; independent of Astro/React/HTTP context
- Comments document intent: `/**  Pure agenda/event utilities. No side effects, no fetch, no env vars. */`

**Sanity Fetch Layer (`src/lib/sanity.ts`):**
- `fetchSettings()`, `fetchDiensten()`, `fetchProjecten()`, `fetchNieuws()`, `fetchPrayerTimes()`
- All async; return null on error (console.error logged, not thrown)
- Use `freshClient` for real-time data (no CDN cache): donations, settings
- Use `sanityClient` (with CDN) for static content: articles, services

**Services (`src/services/`):**
- Async business logic: `webhook-service.ts`, `payment-service.ts`, `email-service.ts`
- Import from logic compartment: `import { isValidPaymentId } from '../lib/logic/webhook-validators'`
- Services coordinate multiple dependencies; contain side effects (API calls, email)

**Pages and API Routes (`src/pages/`):**
- Astro pages: `---` frontmatter (server-side) + HTML/component template
- API routes: `export const POST: APIRoute` handler functions
- Delegate to services; use logic compartment for validation

## Component Patterns

**Astro Components (`*.astro`):**
- Props interface defined at top: `interface Props { settings: any; class?: string; }`
- Destructure from `Astro.props`: `const { settings, class: className } = Astro.props;`
- Client-side scripts in `<script>` tags at end (no `client:*` directives; Astro is SSR-only)
- Class lists managed with `class:list` directive: `class:list={['base', isActive && 'active']}`
- Comments document variants and design system: see `Section.astro` variant docs

**Component Structure (Navigation example):**
- Logo with `urlFor()` image optimization
- Conditional rendering: `{settings?.logo ? (...) : null}`
- Accessibility: ARIA labels, focus management, keyboard trap handling
- Mobile menu with animation: translate-y transitions, focus trap, ESC key

**Props Typing:**
- Loose typing: `settings: any` (Sanity data is dynamic; typing is brittle)
- Optional with fallback: `mosqueName = settings?.mosqueName || 'Onze Moskee'`
- Alt text sanitization: `sanitizeAlt()` helper

## CSS Conventions

**Tailwind v4 Setup:**
- Config in `src/styles/global.css` `@theme {}` block (NOT tailwind.config.cjs)
- Vite plugin: `@tailwindcss/vite` in `astro.config.mjs`
- No safelist; dynamic colors via CSS custom properties

**Design System (Flat Design):**
- NO rounded corners, NO box shadows (enforced via global CSS)
- 60-30-10 color rule:
  - Base (60%): `--color-base: #FBF9F7`, `--color-base-100: #F5F1ED`
  - Primary (30%): `--color-primary: #5B2334`, `--color-primary-dark`, `--color-primary-light`
  - Accent (10%): `--color-accent: #C9A983`, `--color-accent-hover: #d4b999`
- Colors overridable at runtime by Sanity CMS via CSS custom properties

**Typography:**
- Headings: `--font-heading: 'Philosopher'` (serif)
- Body: `--font-body: 'Lato'` (sans-serif)
- Arabic: `--font-arabic: 'Amiri'` (serif)
- All headings inherit primary color via global h1-h6 styles
- H2 has automatic accent underline (40px wide, 2px tall) via `h2::after`

**Spacing and Layout:**
- Container max-width: `max-w-[1280px]`
- Padding: `px-6` horizontal, `py-14 sm:py-20 md:py-24` vertical
- Section variant classes: `'dark'` (dark bg, white text), `'light-50'`, `'light-100'`
- Responsive breakpoints: `sm:`, `md:`, `lg:` prefixes

**Tailwind Utilities:**
- Color tokens: `text-primary`, `bg-accent`, `border-neutral-200`
- Opacity: `text-primary/30` (30% opacity)
- Transitions: `transition-all`, `transition-colors`, `transition-opacity`
- Visibility: `hidden`, `group-hover:opacity-80`, `active:brightness-90`
- Flex layouts: `flex justify-between items-center`, `flex-1 flex flex-col`

**Icons and SVG:**
- Inline SVG with stroke/fill: Heroicons-style stroke icons
- Accessibility: wrapper `<svg>` with no alt (parent link/button has aria-label)

## Error Handling

**Approach:** Fail-safe graceful degradation

**Data Fetching:**
- `try/catch` wrapping all Sanity fetches
- Return null on error: `catch (e) { console.error(...); return null; }`
- Caller receives null; renders fallback or empty state
- Never throw from fetch layer; log and continue

**Validation:**
- Return `ValidationResult` object: `{ valid: boolean; amount?: number; error?: string }`
- Never throw; let caller decide action (400 vs 500)
- Example: `validatePaymentAmount()` returns detailed error message for UI

**API Routes:**
- Wrap entire handler in try/catch
- Catch block returns 500 with generic message: `return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })`
- Errors logged to stdout (Vercel captures logs)
- Internal errors never leak to client

**Service Layer (Webhook Processing):**
- Multiple validation gates; 503 (service unavailable) on critical failures
- Redis timeout → 503 (Mollie retries automatically)
- Missing Redis → 503 (production requirement, not fall back)
- HMAC verification failure → 400 (client error)
- Already processed → 200 OK (idempotent re-delivery)

**Structured Logging:**
- `formatLog(level, event, context, error)` returns JSON string
- Context sanitization removes sensitive keys: API keys, tokens, secrets
- Long strings truncated to 200 chars
- Error objects converted to `{ message, name }` shape
- Logged to stdout; Vercel collects in logs dashboard

## Security Patterns

**CSRF Protection:**
- `checkOrigin(request, siteOrigin)` validates request Origin header
- Returns error response if origin mismatch (server-side form submission required)
- Configured in routes: `src/pages/api/donate.ts`, `src/pages/api/contact.ts`

**Rate Limiting:**
- `checkRateLimit(ip, 'hard-fail', limit, windowMs, route)` via Upstash Redis
- Hard-fail: returns 503 if Redis unavailable (don't degrade security)
- Returns `{ allowed: boolean; source: 'redis' | 'hard-fail' }`
- Applied to donation endpoint (5 per minute per IP)

**HMAC Verification:**
- `verifyHmacTimingSafe(secret, body, signature)` timing-safe comparison
- Uses Web Crypto API (`crypto.subtle.sign()`)
- Required for Mollie webhook authentication

**Honeypot:**
- `isBot(data)` checks for populated hidden fields
- Returns true → respond with success (confuse attackers)
- No error logging (normal spam behavior)

**Environment Secrets:**
- `.env` file present (NOT committed)
- Critical vars: `MOLLIE_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SANITY_WRITE_TOKEN`
- Demo mode guard: `if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx')`

## Data Flow Patterns

**Real-time Data (freshClient, no CDN cache):**
- Donations: `fetchProjecten()` uses freshClient
- Settings changes: `fetchSettings()` uses freshClient
- Menu toggles must be live

**Static Data (sanityClient, CDN cached):**
- Services/diensten: `fetchDiensten()`
- Articles/nieuws: `fetchNieuws()`
- Prayer times config: `fetchPrayerTimes()`
- Cache validity: content doesn't change during day

**Prayer Engine Computation:**
- Config → `buildConfigFromSanity()` → `computeFullPrayerTimes()` → adhan + iqama times
- Pure functions; no mutations
- Result includes `meta: { source: 'computed' | 'cache', method, madhab }`

**Webhook Idempotency:**
- Redis key: `{tenantId}:processed:{paymentId}` (TTL implicit)
- Lock key: `{tenantId}:processing:{paymentId}` (300s expiry)
- Already-processed check → return 200 OK (no Sanity patch)

## Astro-Specific Patterns

**Prerender:**
- `export const prerender = true` for static pages (services, articles)
- `export const prerender = false` for API routes (POST handlers must be dynamic)

**SSR Output Mode:**
- `output: 'server'` in astro.config.mjs (Vercel adapter)
- All pages render server-side; no static builds
- Security headers set in middleware (`src/middleware.ts`)

**Content Security Policy:**
- Mollie script: `script-src https://js.mollie.com`
- Sanity CDN: `img-src https://cdn.sanity.io`, `connect-src https://*.api.sanity.io`
- Google Maps: `frame-src https://www.google.com/maps`
- Admin panel (/admin) excluded (Sanity Studio needs more permissive CSP)

**Middleware:**
- Sets CSP, cache headers, security headers (HSTS, X-Frame-Options, etc.)
- No-cache headers for `/doneren`, `/projecten`, `/bedankt` (real-time donation data)
- Applied to all routes except /admin

## Sanity Schema Patterns

**Schema File Organization (`sanity/schemas/`):**
- File per document type: `post.ts`, `project.ts`, `settings.ts`
- `defineType()` wrapping: `name` (underscore-prefixed for documents), `title`, `type`
- Group organization: `groups: [{ name: 'general', title: 'Algemeen', default: true }]`
- Field definitions use `defineField()` with explicit types

**Settings Singleton (`sanity/schemas/settings.ts`):**
- Single document (`_id: 'settings'`)
- Groups: general, navigation, kalender (calendar), contact, donaties, legal
- Theme options: radio list with color presets
- Menu toggle checkboxes: `showNieuws`, `showServices`, `showLessen`, etc.

**Prayer Times (`sanity/schemas/prayerTimes.ts`):**
- Iqama config per prayer: discriminated union (offset vs fixed time)
- Adhan offsets: map of prayer name to minute adjustment
- Jumuah shifts: array of `{ label, time, note }`

**Slug Fields:**
- Always paired: `slug: { type: 'slug', options: { source: 'titel' } }`
- Accessed as: `"slug": slug.current` in GROQ queries
- Used for URL routing: `/diensten/[slug]`

---

*Convention analysis: 2026-02-28*
