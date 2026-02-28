# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Content Management:**
- Sanity CMS - Full content backend (services, projects, posts, events, lessons, settings)
  - SDK/Client: `@sanity/client` (read + write)
  - Studio: Embedded at `/admin` via `@sanity/astro`
  - Auth: `SANITY_API_TOKEN` (read), `SANITY_WRITE_TOKEN` (write, minimized scope)
  - Read clients: `sanityClient` (CDN-cached for public content) + `freshClient` (uncached for real-time data)

**Payment Processing:**
- Mollie - Dutch payment provider (iDEAL, credit card, PayPal, etc.)
  - SDK/Client: `@mollie/api-client`
  - Auth: `MOLLIE_API_KEY` (test or live)
  - Webhook Auth: `MOLLIE_WEBHOOK_SECRET` (HMAC SHA-256)
  - Webhook endpoint: `POST /api/mollie-webhook`
  - Status: Live in production (`mollie-webhook.ts` line 28 detects test vs. live mode)

**Email Delivery:**
- Resend - Email API for transactional emails
  - SDK/Client: `Resend` class from `resend` package
  - Auth: `RESEND_API_KEY`
  - From address: `${mosqueName} <${FROM_EMAIL_DOMAIN}>`
  - Email templates: `src/lib/email-templates.ts` (HTML templates)
  - Emails sent for:
    - Contact form notifications (mosque + visitor)
    - Volunteer applications (mosque + volunteer)
    - Donation confirmations (donor)
    - Event registrations (mosque + participant)

**Rate Limiting & Idempotency:**
- Upstash Redis - Serverless Redis for distributed state
  - SDK/Client: `Redis` from `@upstash/redis`
  - Auth: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  - Use cases:
    - Rate limiting: 5 requests per 60s per IP (configurable per endpoint)
    - Webhook idempotency: Tracks processed payment IDs with 7-day TTL
    - Processing locks: Concurrency control for webhook handler (300s expiry)
  - Fallback: In-memory rate limiting on local development (no Redis)

## Data Storage

**Databases:**
- Sanity Cloud - Headless CMS database
  - Connection: REST API via `@sanity/client`
  - Client: `sanityClient`, `freshClient`, `writeClient`
  - Dataset: `production` (configurable via `PUBLIC_SANITY_DATASET`)
  - Schema types (from `sanity/schema.ts`): 14 document types including
    - Settings (singleton: mosque name, colors, menu toggles)
    - Projects (donation fundraising)
    - Posts (news articles)
    - AgendaEvents (calendar events)
    - LessonPrograms (education schedules)
    - ServiceWorkers (volunteer intake)
    - JanazahAlerts (funeral prayer notifications)

**File Storage:**
- Sanity CDN - Image hosting + optimization
  - URL builder: `urlFor()` from `@sanity/image-url`
  - Format: Auto-detect WebP/AVIF via Accept header
  - Quality: 80 (default)
  - Width: 1200px (default, callers can override)

**Caching:**
- Sanity CDN (public content, enabled via `useCdn: true`)
- Vercel Edge Network (deployment platform)

## Authentication & Identity

**Auth Provider:**
- Custom origin validation + API tokens
  - Contact/donate forms: CSRF origin check via `checkOrigin()` (`src/lib/security.ts`)
  - Webhooks: HMAC-SHA256 signature verification (Mollie signed requests)
  - Sanity: Token-based (read tokens for `sanityClient`, write tokens for mutations)

**API Tokens (Server-only):**
- `SANITY_API_TOKEN` - Read token for public content + admin fetches
- `SANITY_WRITE_TOKEN` - Write token (separate, minimal scope per Sanity best practices)
- `MOLLIE_API_KEY` - Payment API key
- `MOLLIE_WEBHOOK_SECRET` - Webhook HMAC signing key
- `RESEND_API_KEY` - Email API key
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth

## Monitoring & Observability

**Error Tracking:**
- Console logging (no external service)
  - Logger helper: `src/lib/logic/logger.ts` (`formatLog()` function)
  - Webhook processor logs all steps: verification, Mollie fetch, Sanity commit, email dispatch
  - Sanitizes PII: redacts email addresses in logs

**Logs:**
- Vercel deployment logs (SSR errors, function invocations)
- Mollie webhook logs (per payment processing)
- Sanity mutation logs (implicit in dashboard)

**Analytics:**
- Not integrated (no Vercel Analytics, no third-party)

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless deployment
  - Adapter: `@astrojs/vercel` (SSR mode, function-per-route)
  - Environment: Production environment with secrets management
  - Cold starts: Handled gracefully (Upstash Redis connection pool)

**CI Pipeline:**
- GitHub Actions (assumed, via `git` integration for Sanity studio commits)
- Vercel auto-deploy on push to main branch

**Cron Jobs (Vercel):**
- `GET /api/jobs/reconcile-mollie?since=24h`
  - Schedule: `0 3 * * *` (3 AM UTC daily)
  - Purpose: Reconcile pending payments from Mollie (failsafe for missed webhooks)
  - Auth: `CRON_SECRET` (via Vercel header validation)

## Environment Configuration

**Required env vars at deploy time:**
```
PUBLIC_SITE_URL              # Production domain
PUBLIC_SANITY_PROJECT_ID    # Sanity project ID
SANITY_API_TOKEN            # Read token
SANITY_WRITE_TOKEN          # Write token
MOLLIE_API_KEY              # Payment API key
MOLLIE_WEBHOOK_SECRET       # Webhook signature secret
RESEND_API_KEY              # Email API key
FROM_EMAIL_DOMAIN           # Verified email domain
UPSTASH_REDIS_REST_URL      # Redis endpoint
UPSTASH_REDIS_REST_TOKEN    # Redis auth
CRON_SECRET                 # Cron job authentication
TENANT_ID                   # Multi-tenant identifier
HUB_TELEMETRY_URL           # UmmahOS fleet tracking
```

**Secrets Location:**
- Vercel Environment Variables dashboard (encrypted at rest)
- `.env` file for local development (gitignored)
- Sanity project secrets for studio-level API tokens

## Webhooks & Callbacks

**Incoming:**
- **Mollie Payment Webhook** - `POST /api/mollie-webhook`
  - Triggered on payment status changes (paid, expired, cancelled, etc.)
  - Payload: `{ id: "tr_XXXXX" }` + signature header
  - Verification: HMAC-SHA256 vs. `MOLLIE_WEBHOOK_SECRET`
  - Processing: Idempotent (Redis key tracks processed IDs)
  - Response: HTTP 200 if success, 503 if service unavailable (triggers Mollie retry)

**Outgoing:**
- Resend email webhooks (email delivery tracking)
  - Not consumed by this app; configured in Resend dashboard

## Multi-Tenant Architecture

**Tenant Isolation:**
- Each mosque instance uses separate Sanity dataset (via environment)
- Webhook idempotency: Keyed by `SANITY_PROJECT_ID` + payment ID
- Telemetry: Fleet monitoring via `HUB_TELEMETRY_URL` (UmmahOS Hub)

**Fleet Telemetry:**
- Endpoint: `HUB_TELEMETRY_URL` (from `MEMORY.md`: `https://ummah.be/api/v1/fleet/intake`)
- Identifier: `TENANT_ID` (mosque-specific ID)
- Usage: Anonymous health checks + aggregate metrics

---

*Integration audit: 2026-02-28*
