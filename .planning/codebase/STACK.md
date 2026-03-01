# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code, strict mode (`astro/tsconfigs/strict`)
- HTML/CSS - Templates and styling

**Secondary:**
- JavaScript - Node.js build scripts, Sanity configuration

## Runtime

**Environment:**
- Node.js 22 (specified in `.nvmrc`)
- Astro 5.17.1 - Full-stack JavaScript framework
- Browser: React 19.2.4 for interactive components

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present and committed

## Frameworks

**Core:**
- Astro 5.17.1 - Meta-framework with SSR on Vercel
- React 19.2.4 - Component library for interactive UI
- Tailwind CSS 4.2.0 - Utility-first CSS (via `@tailwindcss/vite` plugin, v4.2.0)
- Sanity CMS 5.11.0 - Headless content management

**Testing:**
- Vitest 4.0.18 - Fast unit test runner

**Build/Dev:**
- Vite - Build system (managed by Astro)
- @astrojs/check 0.9.6 - TypeScript checking for Astro files
- @tailwindcss/vite 4.2.0 - Tailwind CSS v4 Vite plugin (not tailwind.config.js)

## Key Dependencies

**Critical:**
- @sanity/client 5.11.0 - Sanity read/write client (dual clients: CDN + fresh)
- @sanity/image-url 2.0.3 - Sanity image URL builder with auto-format/WebP
- @sanity/vision 5.11.0 - Sanity Vision tool for GROQ testing
- @sanity/astro 3.2.11 - Astro integration for Sanity CMS at `/admin`

**Payment Processing:**
- @mollie/api-client 4.4.0 - Mollie payment gateway SDK
  - Used in: `src/pages/api/donate.ts`, `src/services/webhook-service.ts`, `src/services/reconcile-service.ts`
  - Configuration: `MOLLIE_API_KEY` (test key support for demo mode)

**Email:**
- resend 6.9.2 - Transactional email service
  - Used in: `src/services/email-service.ts`, `src/services/payment-service.ts`
  - Configuration: `RESEND_API_KEY`, `FROM_EMAIL_DOMAIN`

**Rate Limiting & Caching:**
- @upstash/ratelimit 2.0.8 - Distributed rate limiting via Redis
- @upstash/redis 1.36.2 - Upstash Redis REST client
- lru-cache 11.2.6 - In-memory fallback when Upstash unavailable

**Utilities:**
- adhan 4.4.3 - Islamic prayer time calculations
- qrcode 1.5.4 - QR code generation
- astro-portabletext 0.13.0 - Portable Text renderer for Sanity rich text

**Sitemap:**
- @astrojs/sitemap 3.7.0 - Auto-generated XML sitemaps

**Deployment:**
- @astrojs/vercel 9.0.4 - Vercel deployment adapter (SSR mode)

**Build/Integrations:**
- @astrojs/react 4.4.2 - React component integration for Astro

## Configuration

**Environment:**

Stored in `.env` (NOT committed):
- `PUBLIC_SITE_URL` - Published site URL (used for sitemaps, redirects)
- `PUBLIC_SANITY_PROJECT_ID` - Sanity project ID (public, shared in code)
- `PUBLIC_SANITY_DATASET` - Sanity dataset (default: "production")
- `SANITY_API_TOKEN` - Sanity read token (server-only, fallback for writes in dev)
- `SANITY_WRITE_TOKEN` - Sanity write-only token (preferred in production)
- `SANITY_PROJECT_ID` - Server-only tenant identifier (multi-tenant support)
- `MOLLIE_API_KEY` - Mollie payment API key (test_xxxx or live_xxxx)
- `MOLLIE_WEBHOOK_SECRET` - HMAC verification for Mollie webhooks
- `RESEND_API_KEY` - Resend email API key
- `FROM_EMAIL_DOMAIN` - Email sender domain (verified with Resend)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis authentication
- `CRON_SECRET` - Vercel cron job authentication
- `TENANT_ID` - Mosque identifier for fleet telemetry (required)
- `HUB_TELEMETRY_URL` - Fleet telemetry intake URL (required)

See `.env.example` for template.

**Build:**
- `astro.config.mjs` - Astro configuration with integrations, output mode, and security settings
- `sanity.config.ts` - Sanity CMS configuration with auto-slug generation for documents
- `tsconfig.json` - TypeScript strict mode, React JSX from React
- `vercel.json` - Vercel deployment config with cron jobs and security headers
- `.nvmrc` - Node.js version lock (22)

## Platform Requirements

**Development:**
- Node.js 22 (via `.nvmrc`)
- npm for dependency management
- Astro dev server: `npm run dev`

**Production:**
- Vercel (serverless Edge Runtime)
- Astro `output: 'server'` mode with `@astrojs/vercel` adapter
- Custom CSRF protection (`security: { checkOrigin: false }` in astro.config.mjs; manual checks in routes)
- Cron job support via Vercel (`vercel.json` defines `/api/jobs/reconcile-mollie` at `0 3 * * *`)

**External Services:**
- Sanity CMS (managed backend, CDN available)
- Mollie Payment Provider (payment processing)
- Resend (email delivery)
- Upstash Redis (rate limiting, idempotency, webhook locking)
- Vercel (hosting, crons, serverless functions)

## Asset Optimization

**Images:**
- Sanity image URL builder uses `auto('format')` → serves WebP/AVIF based on Accept header
- Default width: 1200px, quality: 80
- Callers can override with `.width()`, etc.

**CSS:**
- Tailwind CSS v4 with Vite plugin
- No `tailwind.config.js` (config lives in `@theme {}` blocks in CSS)
- No safelist needed (Tailwind v4 scans dynamically)

**Fonts:**
- Configured in `src/styles/global.css`
- Caching headers in `vercel.json`: static assets cached for 1 year

---

*Stack analysis: 2026-02-28*
