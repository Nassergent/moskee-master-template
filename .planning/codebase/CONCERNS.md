# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Type Safety Gaps (any types):**
- Issue: 6 instances of loose `any[]` types in component props, limiting IDE support and refactoring safety
- Files: `src/components/Footer.astro`, `src/components/PortableText.astro`, `src/components/DonationCard.astro`, `src/components/Navigation.astro`, `src/components/home/HomeCardSlot.astro`, `src/lib/sanity.ts` (line 111: `let payment: any`)
- Impact: Runtime errors possible when data shape changes; harder to refactor; poor type inference for consumers
- Fix approach: Generate Sanity schema types with `@sanity/types` or define interfaces for common shapes (settings, project, post, etc.)

**Sanity Write Token Fallback Logic:**
- Issue: `src/sanity/lib/client.ts` falls back to read token (SANITY_API_TOKEN) when write token missing, with only a console.warn
- Files: `src/sanity/lib/client.ts` (lines 40-52)
- Impact: In production, this creates security risk if write token not configured. Should fail loudly or skip write operations entirely
- Fix approach: Separate the writeClient instantiation — either require token or return null/noop client. Error in build if missing

**Console Error Patterns (not structured):**
- Issue: 18+ `console.error` calls without structured logging; error context varies
- Files: `src/lib/sanity.ts` (11 fetch helpers), `src/services/webhook-service.ts`, `src/services/payment-service.ts`, API routes
- Impact: Logs are mixed with info messages; harder to filter production errors; no correlation IDs beyond webhook logs
- Fix approach: Use the structured logger (`src/lib/logic/logger.ts`) across all error paths, consistently

## Known Bugs

**PortableText href validation could bypass schema check:**
- Symptoms: XSS in rich-text links if malformed URL sneaks past regex
- Files: `src/components/PortableText.astro` (line 140 returns null on invalid href, but rendering may still happen upstream)
- Trigger: Attacker-controlled Sanity data with edge-case URL schemes
- Workaround: Schema-level validation already in place (v1.6.1), but client-side regex is defense-in-depth; consider adding Content-Security-Policy header

**Hijri date API failures silently degrade:**
- Symptoms: If Aladhan API unreachable, Islamic days simply don't render (no visual warning)
- Files: `src/lib/hijri.ts` (lines 128-131: try/catch silently logs)
- Trigger: Aladhan.com downtime or network timeout during build/SSR
- Workaround: Falls back to empty array, homepage still renders without announcement bar

**Missing error message when prayer times config incomplete:**
- Symptoms: Pages using prayer times show admin warning but don't prevent deployment
- Files: `src/lib/logic/prayer-engine.ts`, `src/components/PrayerManager.astro`
- Trigger: New mosque onboarded without filling Sanity prayerTimes singleton
- Workaround: Admin must manually configure; no build-time validation

## Security Considerations

**Mollie Webhook HMAC validation critical:**
- Risk: Webhook signature not checked = duplicate payments possible
- Files: `src/pages/api/mollie-webhook.ts` (HMAC verification is mandatory, not optional)
- Current mitigation: Webhook service validates signature, idempotency key in Redis prevents double-processing
- Recommendations: Ensure MOLLIE_WEBHOOK_SECRET is always set in production; test webhook replay attacks in CI

**Rate Limiting Depends on Upstash Redis:**
- Risk: If Redis unavailable, rate limiting fails open (no rejection), allowing DDoS
- Files: `src/lib/security.ts`, `src/pages/api/donate.ts` (lines 26-31)
- Current mitigation: Rate limits on donation (5/min), contact form, volunteer form
- Recommendations: Add fallback rate limit (in-memory cache) or return 503 instead of passing requests through

**CSRF Origin Check Disabled in Astro Config:**
- Risk: `astro.config.mjs` line 18: `security: { checkOrigin: false }` means Astro doesn't validate origin
- Files: `astro.config.mjs`, manual `checkOrigin()` in each API route
- Current mitigation: Custom `checkOrigin()` helper validates Host header against PUBLIC_SITE_URL
- Recommendations: Document why this is necessary (webhook routes need HMAC, not origin). Consider enabling Astro's built-in check for non-webhook routes

**API Routes Export Secrets Risk:**
- Risk: Logging or error responses accidentally leak tokens/keys
- Files: `src/pages/api/mollie-webhook.ts` (line 142: safeMeta redacts email), `src/services/webhook-service.ts` (metadata sanitization)
- Current mitigation: Webhook service sanitizes PII before logging (redacts email)
- Recommendations: Audit all API error handlers for secret leakage; never log raw request bodies; use structured logging

## Performance Bottlenecks

**Homepage Aladhan API Call (External Dependency):**
- Problem: `src/pages/index.astro` calls `fetchIslamicDays()` which makes 2+ HTTP requests to aladhan.com per build
- Files: `src/pages/index.astro` (line 27), `src/lib/hijri.ts` (lines 99-126)
- Cause: Islamic days fetched sequentially (can take 2-5s on slow networks); no caching between builds
- Improvement path: Cache Aladhan responses for 24 hours in Redis; make API calls async and graceful fallback to empty on timeout

**Sanity fetchSettings() on Every Page:**
- Problem: `fetchSettings()` fetches 18+ fields across 40+ pages (homepage, components, etc.) with no deduplication
- Files: `src/lib/sanity.ts` (lines 9-18), used in layout and page-level
- Cause: Astro doesn't deduplicate fetch calls across server renders; each page refetches same data
- Improvement path: Implement top-level data cache in middleware or use Astro's experimental data collection API

**QR Code Generation (Server-Side):**
- Problem: `generateEpcQrCode()` runs server-side on every donation page load; SVG generation can be slow for large payloads
- Files: `src/pages/doneren.astro` (lines 27-30), `src/lib/logic/qr-service.ts`
- Cause: No caching; regenerates same QR code for same IBAN on every request
- Improvement path: Cache generated QR codes for 1 hour; or pre-generate at build time

## Fragile Areas

**Webhook Idempotency Requires Redis:**
- Files: `src/services/webhook-service.ts` (lines 69-79)
- Why fragile: On Vercel serverless, in-memory dedup doesn't work (each invocation = fresh memory). Without Redis, duplicate payments possible on webhook retry
- Safe modification: Always test with Redis disabled to catch failures; add explicit error logging when Redis unavailable
- Test coverage: Unit tests exist for normal flow, but not for Redis timeout scenarios

**Prayer Engine Config Defaults Silent:**
- Files: `src/lib/logic/prayer-engine.ts`, `src/components/PrayerManager.astro`
- Why fragile: If Sanity prayerTimes singleton missing, engine shows admin warning but doesn't crash. Entire prayer system invisible.
- Safe modification: Add explicit validation in seed script; prevent site deploy if prayerTimes config incomplete
- Test coverage: 38 tests for computation (✓), but zero for missing config path

**Sanity Type Projections in GROQ Strings:**
- Files: `src/lib/sanity.ts` (all fetch functions use inline GROQ strings)
- Why fragile: If schema changes (field renamed, deleted), GROQ fails silently and returns empty/null
- Safe modification: Generate query types from schema; use TypeScript for GROQ queries (@sanity/groq)
- Test coverage: No integration tests for fetch helpers against live Sanity

**Email Retry Logic Without Circuit Breaker:**
- Files: `src/services/webhook-service.ts` (lines 213-226), `src/services/email-service.ts`
- Why fragile: If Resend API is down, webhook retries 3x with fixed backoff; no exponential backoff or circuit breaker
- Safe modification: Add circuit breaker; after 3 consecutive failures, skip email and log; alert ops
- Test coverage: No test for sustained email failures

## Scaling Limits

**Redis Cache Single Tenant:**
- Current capacity: Upstash free tier = 100 concurrent connections, 256MB storage
- Limit: At 100 concurrent webhooks, Redis connection pool exhausted
- Scaling path: Upgrade to paid Upstash; or implement local LRU cache with Redis fallback

**Sanity Query Complexity:**
- Current capacity: Free tier = 10GB/month bandwidth, 100,000 API ops/month
- Limit: High traffic + fetching 18+ fields per request = quota hit in 2-3 weeks
- Scaling path: Move to paid Sanity plan; implement aggressive caching; split fetches into separate queries

**Mollie Payment Webhooks No Batching:**
- Current capacity: Webhook handler processes one payment at a time
- Limit: If 100+ webhooks arrive in 1 second (flash sale), Vercel cold starts cause backlog
- Scaling path: Queue webhooks in Upstash; async processing with exponential backoff

## Dependencies at Risk

**@sanity/astro npm audit HIGH:**
- Risk: `minimatch` + `path-to-regexp` vulnerabilities in Sanity's dependency chain
- Impact: Affects Studio (`/admin`), not the public website, but still a CVE risk
- Migration plan: Await Sanity v6 with updated deps; or vendor patch

**Aladhan API No SLA:**
- Risk: Free API with no SLA; can be rate-limited or go offline
- Impact: Islamic days feature becomes unavailable; silent failure
- Migration plan: Cache aggressively; or switch to offline hijri calculation library

**Mollie API Client Timeout Default:**
- Risk: Mollie client has 60s default timeout; production payment may hang on slow networks
- Impact: User sees spinner indefinitely; no user-friendly error message
- Migration plan: Wrap Mollie calls with explicit timeout (10s) and user-facing error

## Missing Critical Features

**No Backup / Disaster Recovery Plan:**
- Problem: No documented backup strategy for Sanity data or Redis state
- Blocks: Unable to recover from data loss; Redis cache loss = performance hit but recoverable
- Recommendation: Add daily Sanity export; test recovery procedure monthly

**No Monitoring / Alerting:**
- Problem: No integration with uptime monitoring (Sentry, DataDog, etc.); errors only visible in logs
- Blocks: Can't detect silent failures (Aladhan timeout, Resend down) until customer reports
- Recommendation: Add Sentry to capture SSR errors; set up alert on webhook failures

**No A/B Testing Infrastructure:**
- Problem: Can't safely test new donation flow, prayer engine changes, etc. without affecting all users
- Blocks: Risk of breaking payment UX for entire fleet
- Recommendation: Add feature flag system (via Sanity settings or Vercel KV)

## Test Coverage Gaps

**Untested Error Paths (Sanity Fetch Failures):**
- What's not tested: What happens when Sanity API returns 500? Currently returns empty array/null, but no integration test
- Files: `src/lib/sanity.ts` (all 15 fetch functions have try/catch but no test)
- Risk: Fetch helper could crash due to schema mismatch and never be detected until prod
- Priority: High — add integration tests against mock Sanity API

**Untested Redis Failures:**
- What's not tested: Webhook processing when Redis times out or is unavailable
- Files: `src/services/webhook-service.ts` (returns 503 on Redis error, but not tested)
- Risk: Silent payment loss if Redis down (Mollie webhook won't retry 503)
- Priority: High — add test: `processWebhook() when Redis unavailable`

**Untested API Routes (Integration):**
- What's not tested: End-to-end donation flow (form → Mollie → webhook → email → Sanity update)
- Files: `src/pages/api/donate.ts`, `src/pages/api/mollie-webhook.ts`, email-service
- Risk: Broken payment flow undetected until live
- Priority: High — add E2E test with mock Mollie + mock Resend

**Prayer Computation Edge Cases Not Tested:**
- What's not tested: High latitude (>65°), DST boundary bugs, Ramadan Iqama changes
- Files: `src/lib/logic/prayer-engine.test.ts` (38 tests, but no negative cases: invalid timezone, missing config)
- Risk: Silent miscalculation of prayer times in edge cases
- Priority: Medium — add tests for invalid inputs, edge timezones

**Component Props Type Safety Not Enforced:**
- What's not tested: Components with `any` props don't validate at compile time
- Files: `src/components/Footer.astro`, `src/components/Navigation.astro`, `src/components/PortableText.astro`
- Risk: Props mismatch causes runtime errors (null ref on optional fields)
- Priority: Medium — add strict prop validation in Astro components

---

*Concerns audit: 2026-02-28*
