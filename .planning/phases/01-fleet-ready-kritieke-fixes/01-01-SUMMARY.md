---
phase: 01-fleet-ready-kritieke-fixes
plan: 01
subsystem: payments
tags: [redis, sanity, webhook, recovery, fallback, reprocess, vitest]

# Dependency graph
requires: []
provides:
  - Redis fallback storage for failed Sanity writes (30-day TTL, tenantId:failed:paymentId pattern)
  - Sanity write error handling in payment-service (non-blocking)
  - POST /api/jobs/reprocess-failed-webhooks endpoint (CRON_SECRET protected)
  - 6-test suite covering Redis fallback and reprocess logic
affects: [02-hmac-verification, 03-frequency-cleanup, 04-demo-mode-helper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Redis fallback pattern: catch definitive Sanity failures, store JSON in Redis, continue flow"
    - "Non-blocking error handling: catch + log, never throw from side-effect writes"
    - "SCAN-based batch processing in cron endpoints with cursor pagination"
    - "Test mock isolation: vi.hoisted refs shared between mock factory and test assertions"

key-files:
  created:
    - src/pages/api/jobs/reprocess-failed-webhooks.ts
    - src/tests/webhook-recovery.test.ts
  modified:
    - src/services/webhook-service.ts
    - src/services/payment-service.ts
    - src/lib/logic/logger.ts

key-decisions:
  - "Redis fallback key pattern: {tenantId}:failed:{paymentId} with 30-day TTL — matches existing tenantId prefix convention"
  - "Reprocess endpoint uses x-cron-secret header (not Vercel signature) — simpler for ad-hoc invocation"
  - "Failed keys are NOT deleted on reprocess failure — left for future retry"
  - "payment-service Sanity failure logs to console.error (not Redis) — no tenantId context available there"

patterns-established:
  - "Redis key namespace: {tenantId}:{purpose}:{entityId}"
  - "Cron endpoint auth: x-cron-secret header, 401 on mismatch, 503 when not configured"

requirements-completed: [FLEET-01]

# Metrics
duration: 25min
completed: 2026-02-28
---

# Phase 1 Plan 01: Sanity Write Recovery met Redis Fallback Summary

**Redis-backed Sanity write recovery: failed payments stored with 30-day TTL, reprocess endpoint with SCAN-based batch retry, 6 tests covering full recovery path**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-28T20:00:00Z
- **Completed:** 2026-02-28T20:25:00Z
- **Tasks:** 4 completed
- **Files modified:** 5

## Accomplishments
- Webhook-service definitieve Sanity failures worden nu opgevangen en opgeslagen in Redis als `{tenantId}:failed:{paymentId}` (30 dagen TTL), flow gaat door naar processed marker + email
- payment-service Sanity write heeft nu try-catch zodat email-confirmatie nooit geblokkeerd wordt door Sanity downtime
- POST /api/jobs/reprocess-failed-webhooks kan alle gefaalde writes ophalen via Redis SCAN en opnieuw proberen, met correct succes/fail telwerk
- 6 tests dekken: Redis fallback bij Sanity failure, log event verificatie, flow continuatie, reprocess success path, partial failure counts, en niet-verwijderen bij fout

## Task Commits

Each task was committed atomically:

1. **Task 1.1: Redis failed payment storage in webhook-service** - `da889c0` (feat)
2. **Task 1.2: Error handling in payment-service Sanity write** - `2cd99b7` (feat)
3. **Task 1.3: Reprocess-failed-webhooks API endpoint** - `8478f3e` (feat)
4. **Task 1.4: Webhook recovery tests** - `60ffa2d` (test)

## Files Created/Modified
- `src/services/webhook-service.ts` - Wrap retryWithBackoff in try-catch, Redis fallback storage on definitive failure
- `src/services/payment-service.ts` - Wrap Sanity patch in try-catch, import formatLog for structured error logging
- `src/pages/api/jobs/reprocess-failed-webhooks.ts` - NEW: CRON_SECRET-protected POST endpoint with SCAN + reprocess logic
- `src/tests/webhook-recovery.test.ts` - NEW: 6 tests covering full recovery path
- `src/lib/logic/logger.ts` - Added new LogEvent types: sanity_write_failed, sanity_write_failed_stored, reprocess_*

## Decisions Made
- Redis key pattern `{tenantId}:failed:{paymentId}` sluit aan bij bestaande `{tenantId}:processed:` en `{tenantId}:processing:` conventie
- Reprocess endpoint gebruikt `x-cron-secret` header (niet Vercel cron signature) voor eenvoudiger ad-hoc uitvoering
- Gefaalde keys bij herverwerking worden NIET verwijderd — blijven bewaard voor volgende cron-run
- payment-service logt naar `console.error` (geen Redis) want tenantId context is daar niet beschikbaar

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added new LogEvent types to logger.ts**
- **Found during:** Task 1.1 (Redis fallback implementation)
- **Issue:** `sanity_write_failed_stored` en `reprocess_*` events bestonden niet in de LogEvent union type — TypeScript zou falen
- **Fix:** Toegevoegd: `sanity_write_failed`, `sanity_write_failed_stored`, `reprocess_start`, `reprocess_complete`, `reprocess_success`, `reprocess_failed`
- **Files modified:** src/lib/logic/logger.ts
- **Verification:** `npx tsc --noEmit` geeft geen fouten
- **Committed in:** da889c0 (Task 1.1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Noodzakelijk voor TypeScript correctheid. Geen scope creep.

## Issues Encountered
None — alle taken zijn uitgevoerd zoals gepland.

## Next Phase Readiness
- Plan 01-01 volledig afgerond: webhook recovery pad is nu volledig gewapend
- Volgende plannen (HMAC verificatie, frequency cleanup, demo mode) kunnen onafhankelijk worden uitgevoerd
- Redis key namespace `{tenantId}:failed:*` is gedocumenteerd voor reprocess endpoint

---
*Phase: 01-fleet-ready-kritieke-fixes*
*Completed: 2026-02-28*

## Self-Check: PASSED

All files present and all commits verified:
- src/services/webhook-service.ts: FOUND
- src/services/payment-service.ts: FOUND
- src/pages/api/jobs/reprocess-failed-webhooks.ts: FOUND
- src/tests/webhook-recovery.test.ts: FOUND
- .planning/phases/01-fleet-ready-kritieke-fixes/01-01-SUMMARY.md: FOUND
- da889c0 (task 1.1): FOUND
- 2cd99b7 (task 1.2): FOUND
- 8478f3e (task 1.3): FOUND
- 60ffa2d (task 1.4): FOUND
