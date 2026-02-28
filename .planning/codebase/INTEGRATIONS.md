# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Sanity CMS (Content Management):**
- Service: Sanity (headless CMS, managed backend)
- What it's used for: Central content repository for all mosque data (settings, prayers, events, news, projects, etc.)
- SDK/Client: @sanity/client 5.11.0, @sanity/image-url 2.0.3
- Auth:
  - Public read: `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`
  - Server-side read (fresh): `PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_TOKEN`
  - Server-side write: `SANITY_WRITE_TOKEN` (preferred) or fallback `SANITY_API_TOKEN`
- Configuration files:
  - `sanity.config.ts` - Schema, plugins, auto-slug actions
  - `sanity/lib/client.ts` - Dual clients: `sanityClient` (CDN, cached) and `freshClient` (no cache, real-time)
  - `sanity/schema.ts` - Document type registry
  - `sanity/structure.ts` - Sidebar navigation structure

**Mollie Payment Processing:**
- Service: Mollie (payment gateway, Dutch-friendly)
- What it's used for: Credit card, bank transfer, iDEAL, and other payment methods for donations
- SDK/Client: @mollie/api-client 4.4.0
- Auth: `MOLLIE_API_KEY` (test_xxxx for demo, live_xxxx for production)
- Webhook secret: `MOLLIE_WEBHOOK_SECRET` (HMAC verification, required in live mode)
- Configuration:
  - Creates payments with metadata (projectId, correlationId, email, frequency)
  - Webhook endpoint: `/api/mollie-webhook` (POST)
  - Sandbox mode auto-enabled when key starts with "test_"
- Used in:
  - `src/pages/api/donate.ts` - Payment initiation
  - `src/pages/api/mollie-webhook.ts` - Webhook handler with HMAC verification
  - `src/services/webhook-service.ts` - Webhook processing, idempotency, locking
  - `src/services/payment-service.ts` - Payment completion, Sanity updates
  - `src/services/reconcile-service.ts` - Daily reconciliation of Mollie vs Sanity amounts
  - `src/pages/api/jobs/reconcile-mollie.ts` - Cron job (0 3 * * * daily)

**Resend Email Service:**
- Service: Resend (transactional email, API-first)
- What it's used for: Send confirmation emails (donations, volunteer signups, event registrations, contact form notifications)
- SDK/Client: resend 6.9.2
- Auth: `RESEND_API_KEY` (re_xxxxxxxxxxxx format)
- From domain: `FROM_EMAIL_DOMAIN` (must be verified with Resend; defaults to `onboarding@resend.dev` for testing)
- Configuration:
  - Skips sending when key is default or missing (demo mode)
  - Dynamic "from" address: `${mosqueName} <${FROM_EMAIL_DOMAIN}>`
- Used in:
  - `src/services/email-service.ts` - Contact notification, volunteer signup/confirmation, event registration emails
  - `src/services/payment-service.ts` - Donation confirmation email
  - `src/lib/email-templates.ts` - HTML email templates with theme colors

**Upstash Redis (Rate Limiting, Distributed Caching):**
- Service: Upstash (Redis REST API, serverless-friendly)
- What it's used for: Rate limiting, webhook idempotency markers, processing locks for concurrency safety
- SDK/Client: @upstash/redis 1.36.2, @upstash/ratelimit 2.0.8
- Auth:
  - `UPSTASH_REDIS_REST_URL` - Redis REST endpoint
  - `UPSTASH_REDIS_REST_TOKEN` - Authentication token
- Configuration:
  - Rate limit timeout: 500ms (configurable)
  - Sliding window: 5 requests per 60 seconds (default, varies by route)
  - Fallback: In-memory LRU cache (max 500 entries, 60s TTL) when Redis unavailable
- Used in:
  - `src/lib/security.ts` - Rate limiting for all API routes with fail strategies
  - `src/pages/api/donate.ts` - Donation form (hard-fail strategy: 503 if Redis unavailable)
  - `src/pages/api/mollie-webhook.ts` - Webhook rate limiting (in-memory fallback strategy)
  - `src/pages/api/contact.ts` - Contact form rate limiting (in-memory fallback)
  - `src/pages/api/vrijwilligers.ts` - Volunteer signup rate limiting (in-memory fallback)
  - `src/pages/api/evenement-aanmelding.ts` - Event registration locking and occupancy
  - `src/services/webhook-service.ts` - Idempotency check and processing lock (CRITICAL for production)

## Data Storage

**Database:**
- Type/Provider: Sanity CMS (JSON-based document store)
- Connection: REST API via `@sanity/client`
  - CDN endpoint (cached): `sanityClient` with `useCdn: true`
  - Fresh endpoint (no cache): `freshClient` with `useCdn: false`
- Client: @sanity/client 5.11.0
- Authentication:
  - Read: Public (only project ID and dataset needed)
  - Write: `SANITY_WRITE_TOKEN` (preferred, minimal scope) or `SANITY_API_TOKEN`
- Document types (14 total in `sanity/schema.ts`):
  - Singletons: settings, homePage, homeCards, aboutPage, contactPage, prayerTimes, ramadanOverride, janazahProcedure
  - Collections: post, agendaEvent, service, project, lessonProgram, quote, etiquette, eventCategorie, janazahAlert, eventRegistration, topicHub

**File Storage:**
- Provider: Sanity CMS (asset management)
- Purpose: Images, logos, documents, files stored in Sanity
- URL builder: `@sanity/image-url` with auto-format (WebP/AVIF), default 1200px width, 80% quality

**Caching:**
- CDN: Sanity CDN (enabled for public content via `useCdn: true`)
- In-memory: LRU cache for rate limiting fallback (`lru-cache` 11.2.6)
- HTTP caching: Vercel edge headers configured in `vercel.json`
  - `/_astro/*` - 1 year immutable cache
  - `/fonts/*` - 1 year immutable cache

## Authentication & Identity

**Auth Provider:**
- Type: Custom (none external)
- Sanity token-based:
  - Read token: `SANITY_API_TOKEN` (optional, public reads work without)
  - Write token: `SANITY_WRITE_TOKEN` (required for document creation/updates)
- API security:
  - CSRF origin check (custom implementation, not Astro's built-in)
  - Rate limiting with configurable strategies
  - Honeypot bot detection
  - HMAC verification for Mollie webhooks

**Authorization:**
- No user login system
- Cron jobs authenticated via: `CRON_SECRET` header (Vercel cron signature in prod, custom header in dev)

## Monitoring & Observability

**Error Tracking:**
- Service: None detected (no Sentry, Rollbar, etc.)
- Approach: Console logging with structured JSON format

**Logs:**
- Approach: Structured JSON logging via `src/lib/logic/logger.ts`
- Event types: webhook_received, lock_acquired, mollie_fetched, sanity_commit_ok, sanity_commit_retry, sanity_commit_failed, email_sent, rate_limit_fallback, rate_limit_hard_fail, etc.
- Sensitive keys redacted: secret, token, apiKey, password, MOLLIE_API_KEY, SANITY_WRITE_TOKEN, RESEND_API_KEY, UPSTASH_REDIS_REST_TOKEN, CRON_SECRET
- Correlation ID: Generated for each donation (`generateCorrelationId()` in webhook processing)
- Tenant ID: Included in logs for multi-tenant tracking (`SANITY_PROJECT_ID` or `PUBLIC_SANITY_PROJECT_ID`)

## CI/CD & Deployment

**Hosting:**
- Platform: Vercel (serverless Edge Runtime)
- Deployment: Via git push (automatic deployment from GitHub)
- Region: Vercel global CDN
- Environment: Production (`PROD` flag)

**Build Process:**
- Build command: `astro build`
- Deploy command: Auto-deployed via Vercel integration
- Output: `dist/` directory (serverless functions + static assets)

**CI Pipeline:**
- Service: GitHub Actions (implied, no explicit config file found)
- Tests: `npm test` or `npm run test:watch` (Vitest)

**Cron Jobs:**
- Service: Vercel cron jobs (defined in `vercel.json`)
- Job 1: Reconcile Mollie payments daily at 3 AM
  - Endpoint: `/api/jobs/reconcile-mollie?since=24h`
  - Schedule: `0 3 * * *` (UTC)
  - Auth: Vercel cron signature + `CRON_SECRET`

## Environment Configuration

**Required env vars for production:**
- `PUBLIC_SITE_URL` - Base URL for sitemaps and redirects
- `PUBLIC_SANITY_PROJECT_ID` - Sanity project ID (shared)
- `PUBLIC_SANITY_DATASET` - Sanity dataset (default: "production")
- `SANITY_API_TOKEN` - Read token (fallback for writes in dev)
- `SANITY_WRITE_TOKEN` - Write token (preferred in production)
- `SANITY_PROJECT_ID` - Server-only tenant identifier (optional, for multi-tenant)
- `MOLLIE_API_KEY` - Mollie payment API key
- `MOLLIE_WEBHOOK_SECRET` - Mollie webhook HMAC secret
- `RESEND_API_KEY` - Resend email API key
- `FROM_EMAIL_DOMAIN` - Verified email sender domain
- `UPSTASH_REDIS_REST_URL` - Upstash Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `CRON_SECRET` - Vercel cron authentication
- `TENANT_ID` - Mosque identifier (optional, for fleet telemetry)
- `HUB_TELEMETRY_URL` - Fleet telemetry endpoint (optional)

**Secrets location:**
- Vercel Environment Variables (never committed)
- `.env` file (local development only, in `.gitignore`)
- See `.env.example` for template with all required keys

## Webhooks & Callbacks

**Incoming:**
- `/api/mollie-webhook` (POST) - Payment status updates from Mollie
  - Authentication: HMAC signature verification (`x-mollie-signature` header)
  - Payload: Form-encoded or JSON with `id` (payment ID)
  - Idempotency: Redis-backed marker key `{tenantId}:processed:{paymentId}`
  - Locking: Processing lock key `{tenantId}:processing:{paymentId}` (300s TTL)
  - Processing: Fetches payment from Mollie, validates, commits to Sanity, sends confirmation email
  - Retry: Mollie auto-retries if response is not 200

**Outgoing:**
- Mollie payment redirect: `/bedankt?bedrag=X&bestemming=Y` (redirect from Mollie checkout, no webhook data needed)
- Fleet telemetry: `HUB_TELEMETRY_URL` (optional, not actively used in current codebase)

## API Endpoints (Summary)

**Public:**
- `GET /` - Homepage
- `POST /api/donate` - Initiate donation payment (returns Mollie checkout URL)
- `POST /api/contact` - Submit contact form
- `POST /api/vrijwilligers` - Volunteer signup
- `POST /api/evenement-aanmelding` - Event registration
- `POST /api/mollie-webhook` - Mollie payment webhook

**Internal (Vercel Cron):**
- `POST /api/jobs/reconcile-mollie?since=24h` - Daily payment reconciliation (authenticated via CRON_SECRET)

**Sanity Studio:**
- `/admin` - Sanity CMS studio (embedded via @sanity/astro)

---

*Integration audit: 2026-02-28*
