# Codebase Concerns

**Analysis Date:** 2026-02-28

---

## Tech Debt

### Loose TypeScript Typing (Pervasive)
- **Issue:** Heavy use of `any` type throughout codebase instead of proper types
- **Files:**
  - `src/components/DonationCard.astro:14` - `afbeelding?: any`
  - `src/components/PortableText.astro:9,18,20,38,41,53` - Multiple `any[]` usages in rendering logic
  - `src/components/home/HomeCardSlot.astro:12,16` - `card: any`, `islamicDaysData?: any[]`
  - `src/components/home/EvenementCountdownCard.astro:14,16` - Same pattern
  - `src/pages/index.astro:155,206,218,240` - Event/card mapping without types
  - `src/components/Navigation.astro:8` - `settings: any`
  - `src/pages/api/donate.ts:40` - `let data: any`
  - `src/pages/api/vrijwilligers.ts:32` - `let data: any`
  - `src/pages/api/contact.ts:30` - `let data: any`
  - `src/services/webhook-service.ts:111` - `let payment: any`
  - `src/services/reconcile-service.ts:24,26,58` - Array of any, map returning any
- **Impact:** Zero type safety during refactoring, runtime errors possible, IDE autocomplete breaks down, harder to track data transformations across API boundaries
- **Fix approach:** Create proper Sanity type definitions in `src/types/sanity.ts`, use `Record<string, unknown>` for JSON parsing with strict validation functions, replace all component `any` with explicit Props interfaces

### Unsafe JSON Parsing Without Type Guards
- **Issue:** Form data parsed as JSON without type assertions before use
- **Files:**
  - `src/pages/api/donate.ts:40-61` - `data = await request.json()` then directly access properties
  - `src/pages/api/vrijwilligers.ts:32-55` - Same pattern, trusts user input
  - `src/pages/api/contact.ts:30-53` - Same pattern
  - `src/pages/api/mollie-webhook.ts:48-52` - Both JSON and URLSearchParams parsing without type checking
- **Impact:** Malformed requests silently accepted, undefined property access, potential type confusion attacks
- **Fix approach:** Create `parseFormData()` guard functions with explicit type checking, use `zod` or similar schema validation library for form inputs

### Missing Error Boundaries in Astro Pages
- **Issue:** Server-side fetch failures silently return null/empty arrays with no fallback UI
- **Files:**
  - `src/lib/sanity.ts:15,27,42,54,75,96,111,123,138,150,161,175,205,223,235,250,273,288,300,314,332,348,362,374,392,405,418` - 30+ fetch functions return `null` or `[]` on error
  - `src/pages/index.astro` - Uses `projecten`, `agendaEvents`, `actueel` without null checks
  - `src/pages/doneren.astro` - Uses `projecten`, `quote` without fallback messaging
  - `src/pages/agenda/index.astro` - Uses `events` without error state
- **Impact:** Silent data load failures result in incomplete pages (missing donation projects, prayer times, events); users don't know data failed to load; error logs only in server console
- **Fix approach:** Add `fetchWithFallback()` wrapper that returns `{ data, error }` tuple; render error placeholders in Astro pages showing "Unable to load [feature]"; surface 503 errors to cache strategy

### Hardcoded Test Values in Production Code
- **Issue:** Demo/test detection logic bakes test values into prod code
- **Files:**
  - `src/pages/api/donate.ts:74` - `if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx')`
  - `src/services/webhook-service.ts:64` - Same check `mollieKey === 'test_xxxxxxxxxxxx'`
  - `src/services/email-service.ts:48` - `if (!apiKey || apiKey === 're_xxxxxxxxxxxx')`
  - `src/services/email-service.ts:84` - Same Resend check
- **Impact:** Magic strings are fragile, test key format could change, detection couples to external API design, no central feature flag system
- **Fix approach:** Create `.env.test` pattern and check `import.meta.env.MODE === 'test'` or explicit `DEMO_MODE` flag in settings

---

## Known Bugs

### Aladhan API Intermittent Failures Not Surfaced
- **Symptoms:** Prayer times page loads without Islamic calendar countdowns; silence on network errors
- **Files:** `src/lib/hijri.ts:128-131` - Try-catch silently swallows API errors, logs only to console
- **Trigger:** Aladhan API timeout, 5xx error, or rate limit hit
- **Workaround:** Islamic days simply missing from display (no error banner); page still renders
- **Current behavior:** If `fetchIslamicDays()` fails, empty array returned, no user notification
- **Fix approach:** Return `{ success: boolean, days, error? }` from fetch function; render informational banner "Islamic calendar dates loading..." instead of silence

### Payconiq Image URL Rendering Protected but Silently Fails
- **Symptoms:** Payconiq QR card component missing without user notification
- **Files:** `src/pages/doneren.astro:33-41` - Try-catch around `urlFor()`, sets to undefined silently
- **Trigger:** Corrupt image reference in Sanity, CDN 404, malformed Sanity asset
- **Workaround:** None; Payconiq card simply doesn't render (no error message)
- **Current behavior:** Error is caught and logged; payconiqImageUrl stays undefined (which is by design, but no fallback text shows)
- **Fix approach:** Render alt message "QR code unavailable" when image fails; don't silently hide payment option

### In-Memory Rate Limit Fallback Inconsistency Across Invocations
- **Symptoms:** Rate limits reset per Vercel invocation on serverless, different IPs may bypass limits if traffic spreads across containers
- **Files:** `src/lib/security.ts:32-36` - LRU cache with 60s TTL per invocation
- **Trigger:** High traffic causing multiple concurrent Vercel invocations
- **Workaround:** Redis must be configured or limits won't persist across serverless boundaries
- **Current behavior:** When Upstash Redis is unavailable, in-memory fallback doesn't work reliably on Vercel (each invocation = new memory)
- **Fix approach:** Explicitly document that Upstash Redis is REQUIRED for production; add boot-time warning if Redis unconfigured on Vercel; fail-open with 503 instead of allowing bypass

---

## Security Considerations

### HMAC Signature Verification Skipped in Test Mode (Dangerous Pattern)
- **Risk:** Webhook replay attacks, signature spoofing if test mode credentials leak to prod
- **Files:**
  - `src/pages/api/mollie-webhook.ts:30-42` - If `mollieKey.startsWith('test_')`, skip signature validation
  - `src/services/webhook-service.ts:64` - Same detection
- **Current mitigation:** Test keys only used in development; production should fail if `MOLLIE_WEBHOOK_SECRET` missing
- **Recommendations:**
  - Use explicit `WEBHOOK_SKIP_VERIFICATION` env flag instead of detecting via API key format
  - Log every skipped verification at ERROR level (not just warn)
  - Add integration test that verifies signature validation ON in production mode

### Missing CSRF Token in Donation Form (Only Origin Check)
- **Risk:** Form submission from cross-origin could succeed if origin header spoofable
- **Files:**
  - `src/pages/doneren.astro:76-325` - No CSRF token in form HTML
  - `src/pages/api/donate.ts:18-20` - Only checks `checkOrigin()`
- **Current mitigation:** Origin check + honeypot field; Mollie payment data includes tenantId/correlationId
- **Recommendations:**
  - Add hidden `csrf-token` field to form (generate server-side, validate on POST)
  - Implement SameSite=Strict on auth cookies if added in future
  - Consider nonce for form submissions

### Email Input Validation Insufficient for SQL Injection (in CMS)
- **Risk:** User input email saved directly to Sanity; if CMS query builder doesn't parameterize, injection possible
- **Files:**
  - `src/pages/api/contact.ts:62-67` - Email validated with regex but still saved raw
  - `src/pages/api/vrijwilligers.ts:64-68` - Same
  - `src/services/volunteer-service.ts` - Likely saves to Sanity without escaping
- **Current mitigation:** `isValidEmail()` regex in `src/lib/security.ts:167-169`; Sanity client library should parameterize
- **Recommendations:**
  - Verify Sanity writeClient escapes all user input (it should by default)
  - Add email domain whitelist (no catch-all @example.com addresses)
  - Log all API calls with user emails for audit trail

### Rate Limit Hard-Fail on `/api/donate` Returns 503 (User Confusion)
- **Risk:** Legitimate users hitting donation form during low Redis availability see "Service temporarily unavailable"
- **Files:** `src/pages/api/donate.ts:22-30` - `'hard-fail'` strategy: if Redis down and limit checked, returns 503
- **Current mitigation:** In-memory fallback NOT used on donation endpoint (only `/api/mollie-webhook` uses fallback)
- **Recommendations:**
  - Use `'in-memory-fallback'` strategy on donation to degrade gracefully
  - Separate concerns: donation endpoint should prefer allowing traffic over strict limiting
  - Log why 503 was returned (Redis unavailable vs rate limit hit) for monitoring

### Honeypot Field Responds Success (Looks Like Victory to Attacker)
- **Risk:** Bots see HTTP 200 success and may be confused if they check response; some spam scripts log successes
- **Files:**
  - `src/pages/api/donate.ts:50-56` - Returns `{ success: true }` for bots
  - `src/pages/api/vrijwilligers.ts:42-48` - Same
  - `src/pages/api/contact.ts:40-46` - Same
- **Current mitigation:** Response is JSON, not HTML confirmation page; bot would need to inspect response
- **Recommendations:**
  - Return `HTTP 202 Accepted` instead of 200 (signals processing, not validation)
  - Log honeypot triggers (email domain, hidden field name) for monitoring
  - Consider delaying response 2-5 seconds to discourage scrapers

---

## Performance Bottlenecks

### Sanity CMS Fetch Not Using CDN Cache Selectively
- **Problem:** `freshClient` (no cache) used for projects/settings on donation page; CDN requests on every visit
- **Files:**
  - `src/lib/sanity.ts:11,34` - `freshClient` for `fetchSettings()` and `fetchProjecten()`
  - `src/pages/doneren.astro:11-12` - Both fetched server-side on every render
- **Cause:** Architect wanted real-time donation totals; but no cache invalidation logic
- **Current state:** Every `/doneren` page load hits Sanity API (no ISR/revalidation)
- **Improvement path:**
  - Implement `revalidate: 60` on donation page (stale-while-revalidate)
  - Move real-time total to client-side REST call (fetch every 30s) instead of server render
  - Use Sanity webhooks to trigger Vercel ISR revalidate only on project update

### Hijri Calendar Requires Multiple Aladhan API Calls Per Page Load
- **Problem:** `fetchIslamicDays()` makes 14 API calls (7 days × 2 years) even if only 1-2 days visible
- **Files:** `src/lib/hijri.ts:89-127` - Loop over all 7 Islamic days, then check current + next year
- **Cause:** No upstream caching of Aladhan API responses; fresh fetch on every page load
- **Improvement path:**
  - Cache Aladhan responses in Upstash Redis keyed by `${hijriYear}:${hijriMonth}:${hijriDay}`
  - TTL: 86400s (1 day)
  - Only fetch dates on first page load of the day, subsequent users get cached

### Console.log/console.error Left in Production API Routes
- **Problem:** 50+ console statements in API routes, webhooks, email service (not structured logs)
- **Files:**
  - `src/lib/sanity.ts:15,27,42...` - 30+ fetch error logs
  - `src/pages/api/donate.ts:129` - Raw error object logged
  - `src/pages/api/mollie-webhook.ts:65,67` - console.error/log mixed
  - `src/pages/api/vrijwilligers.ts:80,90` - Same
  - `src/services/webhook-service.ts` - Uses `formatLog()` helper (good)
  - `src/lib/security.ts:69-96` - Multiple console.log for fallback activation
- **Cause:** Inconsistent logging patterns; `formatLog()` only used in webhook-service
- **Improvement path:**
  - Replace all `console.error('text:', e)` with structured logging
  - Create `logError()` wrapper that includes request ID, route, timestamp
  - Use `formatLog()` pattern everywhere for consistency
  - Set `console.*` to no-op in production via build flag

---

## Fragile Areas

### Webhook Service Depends on Upstash Redis Availability (Hard Requirement)
- **Files:** `src/services/webhook-service.ts:76-79` - Returns 503 if Redis missing
- **Why fragile:**
  - No idempotency key persistence without Redis
  - Risk of duplicate donation processing if webhook retried
  - On Vercel serverless, in-memory cache won't work (new invocation = new memory)
- **Safe modification:**
  - Any changes to payment processing MUST test both Redis-available and Redis-unavailable paths
  - Add integration test with mock Redis to simulate failure
  - Document that production REQUIRES Upstash Redis configured
- **Test coverage:**
  - `src/services/webhook-service.test.ts` exists but may not test all failure paths
  - No e2e test for webhook retry logic

### Payment Metadata Parsing Fragile (Missing Validation)
- **Files:**
  - `src/services/webhook-service.ts:138-142` - `parseWebhookMetadata(rawMeta)`
  - `src/lib/logic/webhook-validators.ts:81-89` - Returns null if metadata invalid, no error
- **Why fragile:**
  - If Mollie changes metadata format, parsing fails silently
  - Legacy metadata field names (`project` vs `projectName`) require dual-field support
  - No validation of returned object shape
- **Safe modification:**
  - Create strict schema for metadata (enum for frequency, validate projectId format)
  - Log metadata parse failures with full raw data (redacted for PII)
  - Add Sanity migration if projectId format changes

### Donation Form JavaScript State Sync Issues
- **Files:** `src/pages/doneren.astro:240-325` - Client-side JS manages form state
- **Why fragile:**
  - Multiple data attributes on select elements (`data-name`, `data-project-id`)
  - `aria-pressed` state manually toggled via JS (not reflecting actual state)
  - Form submission could send stale data if JS fails to sync
- **Safe modification:**
  - Add form validation before Mollie redirect
  - Add hidden input field that syncs with selected project ID
  - Test on slow networks (form state may desync during upload)

### Email Template Hardcoded Colors (No CMS Configuration)
- **Files:** `src/lib/email-templates.ts:18-22` - Hardcoded Ummah.be colors
- **Why fragile:**
  - Each mosque needs custom email colors but template uses defaults
  - Color sync between CMS theme and email theme is manual
  - New mosque onboarded might not realize emails don't match site colors
- **Safe modification:**
  - Pass `colors` object to all email template functions (already started)
  - Verify `getColors()` in `src/services/email-service.ts:29-35` maps all primary theme values
  - Add test case for each theme in email render

### PortableText Component Unsafe HTML Rendering
- **Files:** `src/components/PortableText.astro:70-110` - Manual HTML string concatenation
- **Why fragile:**
  - If Sanity content includes HTML entities or malicious strings, XSS possible
  - Link rendering (`markDefs`) relies on `href` field without URL validation
  - No check for dangerous protocols (`javascript:`, `data:`)
- **Safe modification:**
  - Replace string concatenation with Astro HTML literals (safer escaping)
  - Validate URLs in mark definitions against whitelist of schemes
  - Add security test: confirm that `<script>` in Sanity content gets escaped

---

## Scaling Limits

### Donation Project Query Returns Hardcoded Top 2
- **Current capacity:** Maximum 2 projects shown on homepage
- **Limit:** UI component assumes 2-column grid; adding 3rd project breaks layout
- **Files:** `src/lib/sanity.ts:35` - `[0...2]` hardcoded in GROQ query
- **Scaling path:**
  - Change UI to 3-column grid (responsive: 1 on mobile, 3 on desktop)
  - Update query to `[0...10]` (configurable via Sanity settings)
  - Paginate projects if count > 10

### Rate Limit Cache Limited to 500 IPs in Memory
- **Current capacity:** LRU cache holds 500 IP entries before evicting
- **Limit:** If mosque site goes viral or has > 500 concurrent users, rate limiting breaks down (LRU eviction)
- **Files:** `src/lib/security.ts:33-35` - `max: 500`
- **Scaling path:**
  - Increase to 5000 (8KB per entry ≈ 40MB cache, acceptable)
  - Monitor Vercel memory usage; consider serverless memory scaling

### Upstash Redis Free Tier (100K daily commands)
- **Current capacity:** Each webhook = ~5 Redis commands (exists, set, delete); 1000 donations/day = 5K commands, safe margin
- **Limit:** With fleet model, if 10 mosques each get 100 donations/day = 5K commands used
- **Scaling path:**
  - Monitor Upstash usage in Vercel dashboard
  - Plan paid tier ($0.25/month+) as fleet grows
  - Cache webhook processing status with TTL instead of delete

### Sanity API Rate Limits
- **Current capacity:** Free tier = 100 requests/second (burst)
- **Limit:** Homepage loads 6 queries at once; with 100 users = 600 reqs/sec (exceeds limit)
- **Scaling path:**
  - Implement query batching (combine multiple GROQ queries into single request)
  - Add Sanity CDN caching headers (max-age, stale-while-revalidate)
  - Consider upgrading to Sanity Scale plan if fleet > 5 mosques

---

## Accessibility Gaps

### Images Missing Alt Text on Multiple Components
- **Files:**
  - `src/components/home/AangepastCard.astro` - Image `alt` likely missing or generic
  - `src/components/home/DonatieCampagneCard.astro` - Using `urlFor()` without confirmed `alt`
  - `src/components/home/DownloadCard.astro` - Lightbox images missing `alt`
  - `src/components/Footer.astro` - Logo missing `alt` text (only mosque name)
- **Impact:** Screen reader users can't understand image content; WCAG AA failure
- **Fix:** Add descriptive alt text to all images; use `sanitizeAlt()` from `src/lib/logic/seo-utils.ts`

### Form Labels Missing `aria-required="true"`
- **Files:**
  - `src/pages/api/contact.ts` - Validates required fields but form HTML may not declare them
  - `src/pages/api/vrijwilligers.ts` - Same
- **Impact:** Screen readers don't announce required fields to users
- **Fix:** Add `aria-required="true"` to all `<input required>` fields (ARCHITECTURE_LOG v1.6.3 claims this was added, but verify)

### Error Messages Not Associated with Form Fields
- **Files:** `src/pages/doneren.astro:143` - `<p id="donation-error" role="alert" aria-live="polite">` is separate from input fields
- **Impact:** Screen reader users don't know which field has the error
- **Fix:** Add `aria-describedby="error-{fieldName}"` on inputs; move error messages next to fields

### Keyboard Navigation Not Tested on All Interactive Components
- **Files:**
  - `src/pages/doneren.astro:150-160` - Donation form buttons (not tested for tab order)
  - `src/components/home/DownloadCard.astro:165-195` - Lightbox keyboard handling (only Escape key)
- **Impact:** Keyboard-only users may not be able to fully navigate donation flow
- **Fix:** Test with keyboard (Tab, Enter, Escape); ensure focus visible on all buttons

### Color Contrast on Accent Color Text
- **Problem:** `color: #c9a983` (gold/accent) on white backgrounds may fail WCAG AA contrast
- **Files:**
  - `src/pages/doneren.astro:55,62` - Arabic text and quote attribution use accent color
  - `src/components/DonationCard.astro:59,65` - Badge and progress bar
- **Impact:** Users with low vision can't read accent-colored text
- **Fix:** Test contrast ratio; use darker accent shade or add text-shadow for contrast

---

## SEO Issues

### Meta Descriptions Not Dynamically Generated
- **Files:** `src/layouts/BaseLayout.astro` - Takes `description` prop but may be empty
- **Impact:** Search results show no snippet for pages without manual description
- **Fix:** Auto-generate descriptions from first 160 chars of content if missing

### Sitemap Excludes Dynamic Pages
- **Files:** `astro.config.mjs:27-32` - Filters out `/admin`, `/api/`, `/bedankt`
- **Problem:** No dynamic route exclusion; if a service page is private, it still in sitemap
- **Fix:** Add `prerender: false` pages to filter based on route metadata

### Breadcrumb Schema Not on All Pages
- **Files:** `src/pages/agenda/[slug].astro:40` - Breadcrumbs in schema, but not on service/news pages
- **Impact:** Search results may not show breadcrumb navigation on some pages
- **Fix:** Add breadcrumb schema to all detail pages

### Open Graph Image Generation Missing on Some Pages
- **Files:** `src/pages/index.astro` - No ogImage set (uses default or missing)
- **Impact:** Social media previews show no image
- **Fix:** Generate dynamic OG images for homepage (hero image or logo)

---

## Missing Error Handling

### Email Sending Failures Silently Accepted
- **Problem:** If Resend API call fails, user sees success message but email never sent
- **Files:**
  - `src/services/email-service.ts:54-70` - `await resend.emails.send()` without catch
  - `src/pages/api/vrijwilligers.ts:75-82` - Retry 2x but continues even if both fail
- **Impact:** Users think confirmation email was sent; volunteer signup lost
- **Fix:**
  - Add catch block to email send; return error from service
  - Log failed emails to Sanity or external logging service
  - Return 500 to user if email critical; 200 with warning message if non-critical

### Payment Processing Doesn't Validate Mollie Response Structure
- **Problem:** `mollieClient.payments.create()` response assumed to have `getCheckoutUrl()` method
- **Files:** `src/pages/api/donate.ts:102-123` - No null check on payment object
- **Impact:** If Mollie API changes response format, TypeError thrown
- **Fix:**
  - Add type guard: `if (!payment?.id || typeof payment.getCheckoutUrl !== 'function')`
  - Return 502 Bad Gateway if Mollie response unexpected

### Mollie Webhook Processing Missing Sanity Write Error Handling
- **Problem:** Webhook receives valid Mollie payment but Sanity write fails (network, permissions)
- **Files:** `src/services/webhook-service.ts:150+` (not shown in read)
- **Impact:** Payment record updated in Mollie but not in Sanity; donations lost
- **Fix:**
  - Wrap Sanity write in try-catch
  - If write fails, mark Redis key as failed (separate key) and alert operator
  - Implement manual webhook reprocessing endpoint

---

## Dead Code / Unused Exports

### Deprecated `parseCurrencyAmountCents()` Function Still Exported
- **Files:** `src/lib/logic/payment-validators.ts:46-48` - Marked deprecated but not removed
- **Problem:** Creates confusion; developers may use deprecated function
- **Fix:** Create migration guide; remove in v2.0

### Unused Utility Functions
- **Files:** `src/lib/logic/seo-utils.ts` - May have unused sanitization functions
- **Fix:** Run coverage analysis to identify unused exports

---

## Incomplete Features

### Event Registration Form May Not Persist Confirmation Status
- **Problem:** Form submitted but no way to verify user is registered
- **Files:** `src/components/ui/EventRegistrationForm.astro` - Likely generates email but doesn't store registration
- **Fix:** Add registration record to Sanity (track confirmed emails, allow duplicate-prevention)

### Donation Frequency "Maandelijks" (Monthly) Not Processed
- **Problem:** Mollie doesn't support recurring donations; frequency metadata stored but ignored
- **Files:**
  - `src/pages/doneren.astro` - Form has `frequency` radio buttons
  - `src/pages/api/donate.ts:100,115` - frequency stored in metadata but not used
- **Impact:** User selects "monthly" but gets single charge; confusion
- **Fix:**
  - Remove frequency selector from form (Mollie doesn't support)
  - OR implement 3rd-party subscription service (Mollie subscriptions API, Stripe)

### Janazah Alert System Missing Mosque Contact Info in Notification
- **Problem:** User sees alert but doesn't know how to contact mosque for details
- **Files:** `src/components/ui/janazah/JanazahBanner.astro` - Shows alert but no phone/email
- **Fix:** Include mosque phone number from settings in Janazah banner

---

## Fleet-Readiness Concerns

### Hardcoded Themefor Email Colors (No Multi-Tenancy)
- **Problem:** Email colors hardcoded to Ummah.be palette; each mosque needs custom colors
- **Files:** `src/lib/email-templates.ts:18-22` - Hardcoded defaults
- **Current state:** `getColors()` in email-service maps theme but defaults to Ummah palette
- **Fix:** Ensure each mosque instance stores its own color scheme in Sanity settings

### Settings Fetch Not Isolated Per Tenant
- **Problem:** `fetchSettings()` pulls from Sanity dataset; if dataset is shared, all mosques see same settings
- **Files:** `src/lib/sanity.ts:9-18`
- **Current state:** Each child mosque has separate Sanity dataset (isolated)
- **Risk:** If datasets accidentally merged, settings bleed across mosques
- **Fix:** Add tenant ID check in Sanity queries; enforce dataset isolation at Sanity API level

### No Feature Flag System for Fleet Rollout
- **Problem:** New features activated immediately across all mosques; no gradual rollout
- **Files:** No feature flag logic found
- **Improvement:** Create `src/lib/features.ts` that checks Sanity settings for `enabledFeatures` array; allow per-mosque feature control

### Master Template Contains Instance-Specific Data
- **Problem:** ARCHITECTURE_LOG claims "identity-less" but may have hardcoded mosque names or IDs
- **Files:** All files use `settings?.mosqueName` (good) but check for hardcoded values
- **Current state:** Appears clean (using `settings` object throughout)
- **Risk:** Any hardcoded IDs/names will clone to all mosques
- **Fix:** Audit all files for "Moskee\|mosque\|Islam" literals; all must come from settings

---

## Code Smells

### Magic Numbers Without Constants
- **Files:**
  - `src/lib/sanity.ts:35` - `[0...2]` hardcoded for project limit
  - `src/lib/logic/payment-validators.ts:6-9` - MIN: 1, MAX: 10_000 defined but not used everywhere
  - `src/lib/security.ts:33` - LRU max: 500
  - `src/pages/api/mollie-webhook.ts:14,16` - Rate limit 20 req/min hardcoded
  - `src/pages/api/donate.ts:24` - 5 donations per 60s hardcoded
- **Fix:** Create `src/constants.ts` with all magic numbers; import everywhere

### Inconsistent Error Response Formats
- **Files:**
  - `src/pages/api/donate.ts:44,66,86` - Returns `{ error: string }`
  - `src/pages/api/vrijwilligers.ts:26,36,58,91` - Returns `{ error: string }` or `{ success: true }`
  - `src/pages/api/mollie-webhook.ts:20` - Returns plain text "Rate limited"
- **Fix:** Create response wrapper: `{ success: boolean, error?: string, data?: T }`; use everywhere

### No Centralized Logging Configuration
- **Files:**
  - `src/lib/logic/logger.ts` - `formatLog()` exists but not used everywhere
  - 30+ console.error/log calls scattered in codebase
- **Fix:** Create `src/lib/logging.ts` wrapper that routes all logs to structured log service (e.g., Sentry, LogRocket)

### Excessive Prop Drilling in Astro
- **Files:** `src/pages/index.astro` - Passes `islamicDaysData`, `settings` to multiple nested components
- **Fix:** Create context provider or fetch directly in leaf components (Astro supports top-level await)

---

## Documentation Gaps

### No API Documentation for Form Endpoints
- **Missing:** Request/response schema for `/api/donate`, `/api/vrijwilligers`, `/api/contact`
- **Fix:** Create `API.md` with cURL examples, error codes, rate limits

### Rate Limiting Strategy Not Documented
- **Missing:** How rate limits work, fallback behavior, what to do if 429 received
- **Fix:** Add section to README or `/docs/SECURITY.md`

### Webhook Retry Logic Not Documented
- **Missing:** How often Mollie retries, how long idempotency key persists, what to do if webhook fails permanently
- **Fix:** Add section to ARCHITECTURE_LOG or new `WEBHOOK.md`

---

## Testing Coverage Gaps

### No E2E Tests for Donation Flow
- **Files:** 3 test files exist (`*.test.ts`) but none test donation form → payment → webhook → email
- **Gap:** Full flow untested; payment could break without detection
- **Fix:** Add Playwright E2E test covering: form submission → Mollie redirect → webhook processing

### Email Service Tests Missing
- **Files:** `src/services/email-service.ts` - No test file
- **Gap:** Email formatting, color mapping untested; mosque colors might not render correctly
- **Fix:** Create `email-service.test.ts` with snapshot tests for each email template

### Sanity Integration Tests Missing
- **Files:** `src/lib/sanity.ts` - No mock tests
- **Gap:** If Sanity API changes, queries fail silently (return null)
- **Fix:** Add `sanity.test.ts` with mocked Sanity client; test each fetch function

### Rate Limiting Fallback Not Tested in Production Mode
- **Files:** `src/lib/security.ts` - Tests may only cover in-memory, not Redis failover
- **Gap:** Actual Redis failure behavior unknown
- **Fix:** Add test that mocks Redis connection error; verify hard-fail vs fallback behavior

---

*Concerns audit: 2026-02-28*
