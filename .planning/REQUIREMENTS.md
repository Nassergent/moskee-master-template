# Requirements: Security Hardening

**Defined:** 2026-02-28
**Core Value:** Betalingen en API-bescherming mogen nooit stil falen — elke failure moet detecteerbaar en herstelbaar zijn.

## v1 Requirements

### Rate Limiting

- [x] **RATE-01**: `checkRateLimit()` accepteert een `failStrategy` parameter (`hard-fail` | `in-memory-fallback`) die bepaalt wat er gebeurt als Redis onbereikbaar is
- [x] **RATE-02**: `/api/donate` route gebruikt `hard-fail` strategie — retourneert 503 als rate limiting niet werkt
- [x] **RATE-03**: `/api/contact` en `/api/vrijwilligers` routes gebruiken `in-memory-fallback` strategie
- [ ] **RATE-04**: Onbegrensde `rateLimitMap` is vervangen door `LRUCache` met configureerbare `max` entries en `ttl`
- [x] **RATE-05**: `@upstash/ratelimit` instance gebruikt `timeout: 500` om Redis latency te begrenzen
- [ ] **RATE-06**: Elke fallback of 503 response logt een structured entry met `source` (`redis` | `memory` | `hard-fail`), route, en IP (gehashed)

### Webhook Idempotency Testing

- [ ] **WHTEST-01**: Test: `processWebhook()` retourneert 503 wanneer Redis een timeout geeft (slow reject, gesimuleerd met fake timers)
- [ ] **WHTEST-02**: Test: `processWebhook()` retourneert 503 wanneer Redis volledig onbereikbaar is (connection refused)
- [ ] **WHTEST-03**: Test: `processWebhook()` verwerkt een payment slechts één keer wanneer dezelfde paymentId twee keer wordt aangeboden (idempotency check)
- [ ] **WHTEST-04**: Test: Mollie webhook POST met getamperde HMAC signature wordt afgewezen
- [ ] **WHTEST-05**: Shared `vi.mock('@upstash/redis')` factory is herbruikbaar across alle webhook test scenario's
- [ ] **WHTEST-06**: Tests verifieren dat 503 paden een structured log entry emitten met `paymentId` en `tenantId`

## v2 Requirements

### Type Safety

- **TYPE-01**: Sanity schema types automatisch genereren uit schema definities
- **TYPE-02**: Alle `any` types in componenten vervangen door gegenereerde types

### Observability

- **OBS-01**: Sentry integratie voor SSR error capturing
- **OBS-02**: Uptime monitoring met alerting op webhook failures

## Out of Scope

| Feature | Reason |
|---------|--------|
| Circuit breaker pattern | Niet haalbaar op stateless serverless (Vercel) — geen gedeelde state |
| Gedeelde in-memory state tussen invocations | Vercel architectuur staat dit niet toe |
| Aladhan API caching | Performance milestone, niet security |
| fetchSettings() deduplicatie | Performance milestone |
| A/B testing infrastructuur | Niet relevant voor security hardening |
| Sentry/monitoring | Apart project, buiten scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RATE-01 | Phase 1 | Complete (2026-02-28) |
| RATE-02 | Phase 1 | Complete (2026-02-28) |
| RATE-03 | Phase 1 | Complete (2026-02-28) |
| RATE-05 | Phase 1 | Complete (2026-02-28) |
| RATE-04 | Phase 2 | Pending |
| RATE-06 | Phase 2 | Pending |
| WHTEST-01 | Phase 3 | Pending |
| WHTEST-02 | Phase 3 | Pending |
| WHTEST-03 | Phase 3 | Pending |
| WHTEST-04 | Phase 3 | Pending |
| WHTEST-05 | Phase 3 | Pending |
| WHTEST-06 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
