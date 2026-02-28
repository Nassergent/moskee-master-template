# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript - Full codebase type safety, Astro components + services
- JavaScript - Package scripts, configuration files

**Secondary:**
- HTML/CSS - Astro templates with Tailwind CSS v4
- GROQ - Sanity query language (in `src/lib/sanity.ts`)

## Runtime

**Environment:**
- Node.js 22 (specified in `.nvmrc`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Astro 5.17.1 - Full-stack JavaScript web framework
  - Output: `server` mode (SSR via `@astrojs/vercel`)
  - CSRF security: Custom origin validation (Astro 5 CSRF disabled globally)
- React 19.2.4 - Interactive components (client-side)
- Tailwind CSS 4.2.0 - Utility-first styling via `@tailwindcss/vite` plugin
  - Config: Theme defined in `src/styles/global.css` (@theme block, NOT tailwind.config.cjs)
  - Flat design: No rounded corners or box shadows (enforced via global CSS)

**CMS:**
- Sanity 5.11.0 - Headless CMS
- @sanity/astro 3.2.11 - Sanity studio integration at `/admin`
- @sanity/vision 5.11.0 - GraphQL playground in studio

**Payment Processing:**
- @mollie/api-client 4.4.0 - Dutch payment processor (iDEAL, credit card, etc.)

**Email:**
- Resend 6.9.2 - Email API

**Rate Limiting & Session Storage:**
- @upstash/redis 1.36.2 - Serverless Redis for rate limiting + idempotency keys
- @upstash/ratelimit 2.0.8 - Rate limiting middleware

**Testing:**
- vitest 4.0.18 - Unit test runner

**Build/Dev:**
- @astrojs/vercel 9.0.4 - Vercel deployment adapter for SSR
- @astrojs/react 4.4.2 - React component integration
- @astrojs/sitemap 3.7.0 - Automatic sitemap generation
- astro-portabletext 0.13.0 - Rich text rendering from Sanity
- @sanity/image-url 2.0.3 - Image URL builder with optimization

## Key Dependencies

**Critical:**
- @mollie/api-client - Payment processing; required for donation workflow
- @sanity/astro - CMS studio + content management; drives all dynamic content
- @upstash/redis - Essential for production: idempotency keys + rate limiting (serverless-compatible)
- Resend - Email notifications (contact forms, volunteers, donation confirmations)

**Infrastructure:**
- adhan 4.4.3 - Islamic prayer time calculations (adhan times, prayer schedules)
- qrcode 1.5.4 - QR code generation (payment QR codes)
- @sanity/image-url - Image optimization pipeline (WebP/AVIF via `auto('format')`)

**Type Safety:**
- @types/qrcode 1.5.6 - TypeScript types for QR code library

## Configuration

**Environment Variables (from `.env.example`):**

**Site:**
- `PUBLIC_SITE_URL` - Deployment URL (e.g., `https://your-mosque.vercel.app`)

**Sanity CMS:**
- `PUBLIC_SANITY_PROJECT_ID` - Public project ID (used by read clients)
- `PUBLIC_SANITY_DATASET` - Dataset name (default: `production`)
- `SANITY_API_TOKEN` - Read token for Sanity API
- `SANITY_WRITE_TOKEN` - Write token (separate, minimized permissions)
- `SANITY_PROJECT_ID` - Server-only project ID (for multi-tenant identification)

**Mollie Payments:**
- `MOLLIE_API_KEY` - API key (test: `test_*`, live: `live_*`)
- `MOLLIE_WEBHOOK_SECRET` - HMAC webhook signature verification (from Mollie Dashboard > Developers > Webhooks)

**Resend Email:**
- `RESEND_API_KEY` - API key for email sending
- `FROM_EMAIL_DOMAIN` - Domain for from address (must be verified in Resend; default: `onboarding@resend.dev`)

**Upstash Redis:**
- `UPSTASH_REDIS_REST_URL` - REST endpoint URL
- `UPSTASH_REDIS_REST_TOKEN` - Auth token

**Operations:**
- `CRON_SECRET` - Secret for triggering cron jobs (via Vercel)
- `TENANT_ID` - Mosque identifier (for multi-tenant fleet)
- `HUB_TELEMETRY_URL` - UmmahOS fleet telemetry endpoint (e.g., `https://ummah.be/api/v1/fleet/intake`)

**Build:**
- `astro.config.mjs` - Astro configuration (adapters, integrations, security settings)
- `tsconfig.json` - TypeScript strict config + JSX React settings

## Platform Requirements

**Development:**
- Node.js 22
- npm or compatible package manager
- Git (for Sanity studio commits)

**Production:**
- Vercel (SSR deployment via `@astrojs/vercel` adapter)
- Sanity Cloud (CMS hosting)
- Upstash account (Redis for rate limiting + webhooks)
- Mollie account (payment processing)
- Resend account (email delivery)

**Performance:**
- Sanity CDN enabled for public read client (`useCdn: true` in `sanityClient`)
- Fresh client (`useCdn: false`) used only for real-time data: projects, donation amounts, alerts
- Image optimization: Sanity auto-formats WebP/AVIF; default quality 80, width 1200

---

*Stack analysis: 2026-02-28*
