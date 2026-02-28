# Roadmap: Fleet-Ready Kritieke Fixes — v1.1

## Overview

Deze milestone maakt het moskee-master-template veilig deploybaar naar meerdere moskee-instanties. Vier kritieke issues worden opgelost: (1) Sanity write failures in de webhook-flow krijgen retry + Redis fallback, (2) HMAC verificatie wordt losgekoppeld van API key format, (3) de ongebruikte frequency parameter wordt opgeruimd, (4) alle hardcoded test values worden vervangen door een centrale `isDemoMode()` helper.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work

- [ ] **Phase 1: Webhook Sanity Write Recovery** - Sanity write failures opvangen met Redis fallback + reprocess endpoint
- [ ] **Phase 2: HMAC Verificatie Fix** - Test mode detectie vervangen door expliciete env var
- [ ] **Phase 3: Frequency Cleanup** - Ongebruikte frequency parameter opruimen uit API
- [ ] **Phase 4: Centrale Demo Mode Helper** - Alle hardcoded test values vervangen door isDemoMode()

## Phase Details

### Phase 1: Webhook Sanity Write Recovery
**Goal**: Sanity write failures in de payment flow worden opgevangen — geen donatie gaat verloren, zelfs bij Sanity downtime
**Depends on**: Nothing (first phase)
**Requirements**: FLEET-01
**Success Criteria** (what must be TRUE):
  1. `webhook-service.ts` vangt Sanity write failures op en slaat failed payments op in Redis
  2. `payment-service.ts:41-44` heeft error handling (was volledig onbeschermd)
  3. `/api/jobs/reprocess-failed-webhooks` endpoint bestaat en verwerkt failed Redis keys
  4. Tests bewijzen: mock Sanity failure → Redis key aangemaakt → reprocess werkt
**Plans:** 1 plan

Plans:
- [ ] 01-01-PLAN.md — Sanity write recovery met Redis fallback + reprocess endpoint

### Phase 2: HMAC Verificatie Fix
**Goal**: HMAC verificatie wordt niet meer bepaald door API key format — expliciete env var controleert of verificatie wordt overgeslagen
**Depends on**: Nothing (independent)
**Requirements**: FLEET-02
**Success Criteria** (what must be TRUE):
  1. `mollieKey.startsWith('test_')` check is vervangen door `WEBHOOK_SKIP_VERIFICATION` env var
  2. Skip wordt gelogd als ERROR level
  3. Productie-omgeving kan nooit per ongeluk verificatie overslaan
**Plans:** 1 plan

Plans:
- [ ] 02-01-PLAN.md — HMAC verificatie losgekoppeld van API key format

### Phase 3: Frequency Cleanup
**Goal**: De ongebruikte frequency parameter is opgeruimd uit de API flow — geen dead code in het donatie-pad
**Depends on**: Nothing (independent)
**Requirements**: FLEET-03
**Success Criteria** (what must be TRUE):
  1. `donate.ts` stuurt frequency niet meer naar Mollie description logic
  2. Frequency veld blijft in Mollie metadata (voor toekomstige Subscriptions API)
  3. Frontend blijft `'eenmalig'` hardcoded sturen (backward compat)
**Plans:** 1 plan

Plans:
- [ ] 03-01-PLAN.md — Frequency parameter cleanup

### Phase 4: Centrale Demo Mode Helper
**Goal**: Alle 6 hardcoded test value checks zijn vervangen door één centrale `isDemoMode()` helper — nieuwe services hoeven nooit meer magic strings te kennen
**Depends on**: Nothing (independent)
**Requirements**: FLEET-04
**Success Criteria** (what must be TRUE):
  1. `src/lib/env.ts` bestaat met `isDemoMode()` en per-service helpers
  2. Alle 6 locaties gebruiken de helper i.p.v. hardcoded strings
  3. Tests bewijzen dat demo mode correct detecteert op basis van env vars
**Plans:** 1 plan

Plans:
- [ ] 04-01-PLAN.md — Centrale isDemoMode() helper + migratie 6 locaties
