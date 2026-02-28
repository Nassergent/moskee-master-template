# Moskee-Master-Template — Security Hardening

## What This Is

Security hardening milestone voor het moskee-master-template SaaS platform. Richt zich op het oplossen van de twee hoogste-prioriteit productierisico's uit de codebase-analyse: Redis fail-open bij rate limiting en ontbrekende webhook idempotency test coverage.

## Core Value

Betalingen en API-bescherming mogen nooit stil falen — elke failure moet detecteerbaar en herstelbaar zijn.

## Requirements

### Validated

<!-- Bestaande capabilities uit de codebase -->

- ✓ Mollie webhook HMAC signature validatie — existing
- ✓ Redis-based rate limiting op donatie, contact en vrijwilligers routes — existing
- ✓ Webhook idempotency via Upstash Redis (single payment processing) — existing
- ✓ CSRF origin check via custom checkOrigin() helper — existing
- ✓ PortableText href XSS defence-in-depth — existing
- ✓ Structured logger beschikbaar in `src/lib/logic/logger.ts` — existing
- ✓ Prayer engine met 38 unit tests — existing
- ✓ Payment service met Mollie integratie — existing

### Active

- [ ] Redis fail-open fallback: in-memory LRU cache als Redis onbereikbaar is
- [ ] Configureerbare fail-strategie per route: hard fail (503) voor donaties, in-memory fallback voor contact/vrijwilligers
- [ ] Webhook idempotency tests: Redis timeout scenario
- [ ] Webhook idempotency tests: Redis volledig onbereikbaar scenario
- [ ] Webhook idempotency tests: duplicate webhook (zelfde payment 2x)
- [ ] Webhook idempotency tests: HMAC replay attack (verlopen/hergebruikte signature)

### Out of Scope

- Sanity schema type generation (any types) — volgende milestone
- Monitoring/alerting integratie (Sentry) — apart project
- Aladhan API caching — performance milestone
- fetchSettings() deduplicatie — performance milestone
- A/B testing infrastructuur — niet nodig voor security

## Context

- Brownfield project: Astro 5 + Tailwind v4 + React 19 + Sanity v5 + Vercel SSR
- Rate limiting via @upstash/ratelimit + @upstash/redis
- Webhook handler in `src/services/webhook-service.ts` met Redis idempotency
- Security utilities in `src/lib/security.ts`
- Bestaande test suite: Vitest met 38+ prayer engine tests
- Codebase map beschikbaar in `.planning/codebase/`
- Fleet model: changes propageren naar alle moskee-instanties (Moeder → Kinderen)

## Constraints

- **Stack**: Bestaande Astro 5 + Upstash Redis stack — geen nieuwe dependencies tenzij noodzakelijk
- **Fleet impact**: Alle wijzigingen moeten veilig deployen naar de volledige moskee-vloot
- **Vercel serverless**: In-memory cache is per-invocation — bewust van cold start beperkingen
- **Done criteria**: Alle tests groen + code review voor merge

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Security-only scope | Type safety en performance zijn lagere prioriteit dan productierisico's | — Pending |
| Configureerbare fail-strategie per route | Donaties moeten hard falen (geld), contactformulieren mogen fallback gebruiken | — Pending |
| Alle 4 webhook test scenario's | Volledige coverage van kritieke betaalflow | — Pending |

---
*Last updated: 2026-02-28 after initialization*
