# Moskee-Master-Template — Security Hardening

## What This Is

Moskee-master-template SaaS platform met geharde security laag. Redis rate limiting faalt nu veilig per route (hard-fail voor donaties, graceful degradation voor overige), met bounded in-memory fallback en volledige observability. Webhook idempotency pipeline heeft 100% test coverage voor alle Redis failure modes.

## Core Value

Betalingen en API-bescherming mogen nooit stil falen — elke failure moet detecteerbaar en herstelbaar zijn.

## Current Milestone: v1.1 Type Safety (Core)

**Goal:** Replace `any` types in fetch helpers and core components with Sanity schema-generated TypeScript types.

**Target features:**
- Sanity typegen pipeline (auto-generated types from 19 schemas)
- Typed fetch helper return types (~25 helpers)
- Typed component props (settings, cards, events, projects)

## Requirements

### Validated

- ✓ Mollie webhook HMAC signature validatie — existing
- ✓ Redis-based rate limiting op donatie, contact en vrijwilligers routes — existing
- ✓ Webhook idempotency via Upstash Redis (single payment processing) — existing
- ✓ CSRF origin check via custom checkOrigin() helper — existing
- ✓ PortableText href XSS defence-in-depth — existing
- ✓ Structured logger beschikbaar in `src/lib/logic/logger.ts` — existing
- ✓ Prayer engine met 38 unit tests — existing
- ✓ Payment service met Mollie integratie — existing
- ✓ Typed per-route fail strategy (hard-fail / in-memory-fallback) — v1.0
- ✓ Donate route hard-fails (503) bij Redis outage — v1.0
- ✓ Non-financial routes degraden naar in-memory fallback — v1.0
- ✓ Bounded LRU cache (max 500, TTL 60s) vervangt onbegrensde Map — v1.0
- ✓ Redis timeout begrensd op 500ms — v1.0
- ✓ Structured fallback/hard-fail logging met gehashed IP — v1.0
- ✓ Webhook idempotency tests: Redis timeout, ECONNREFUSED, duplicate delivery — v1.0
- ✓ HMAC tampered signature test — v1.0

### Active

<!-- Current scope: v1.1 Type Safety (Core) -->

- [ ] Sanity typegen setup with auto-generated TypeScript types
- [ ] Typed fetch helper return types (all ~25 helpers in src/lib/sanity.ts)
- [ ] Typed component props for core components (settings, cards, events, projects)

### Out of Scope

- Inline template casts (`.map((item: any) => ...)`) — v1.2
- Monitoring/alerting integratie (Sentry) — apart project
- Aladhan API caching — performance milestone
- fetchSettings() deduplicatie — performance milestone
- A/B testing infrastructuur — niet nodig

## Context

- Brownfield project: Astro 5 + Tailwind v4 + React 19 + Sanity v5 + Vercel SSR
- Rate limiting via @upstash/ratelimit + @upstash/redis + lru-cache v11
- Webhook handler in `src/services/webhook-service.ts` met Redis idempotency
- Security utilities in `src/lib/security.ts` (FailStrategy, RateLimitResult, LRUCache, hashIp)
- Logger in `src/lib/logic/logger.ts` (rate_limit_fallback, rate_limit_hard_fail events)
- Test suite: Vitest met 43 tests (38 prayer engine + 3 webhook service + 3 HMAC)
- Fleet model: changes propageren naar alle moskee-instanties (Moeder → Kinderen)
- Shipped v1.0 Security Hardening: 26 files changed, +3,578 / -138

## Constraints

- **Stack**: Bestaande Astro 5 + Upstash Redis stack — lru-cache is enige nieuwe dependency
- **Fleet impact**: Alle wijzigingen moeten veilig deployen naar de volledige moskee-vloot
- **Vercel serverless**: In-memory cache is per-invocation — bewust van cold start beperkingen
- **Done criteria**: Alle tests groen + code review voor merge

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Security-only scope | Type safety en performance zijn lagere prioriteit dan productierisico's | ✓ Good — focused milestone, shipped in 1 day |
| Configureerbare fail-strategie per route | Donaties moeten hard falen (geld), contactformulieren mogen fallback gebruiken | ✓ Good — 5 callers correctly configured |
| Alle 4 webhook test scenario's | Volledige coverage van kritieke betaalflow | ✓ Good — 6 tests covering all failure modes |
| LRUCache max=500, ttl=60s | Safe default for mosque platform traffic | ✓ Good — bounded, no ttlAutopurge needed on serverless |
| emitLog=false for local dev | Prevents log noise when no Redis configured | ✓ Good — clean dev experience |
| hashIp 16-char SHA-256 prefix | GDPR-compliant IP pseudonymization in logs | ✓ Good — sufficient for correlation |

---
*Last updated: 2026-02-28 after v1.1 milestone start*
