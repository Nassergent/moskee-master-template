---
phase: 03-webhook-idempotency-test-suite
plan: 01
subsystem: testing
tags: [vitest, upstash-redis, mollie, webhook, idempotency, fake-timers, vi.hoisted]

# Dependency graph
requires:
  - phase: 01-failstrategy-foundation
    provides: processWebhook() function with WebhookResult return type and Redis lazy-init pattern
  - phase: 02-in-memory-lru-observability
    provides: formatLog() structured JSON logger with paymentId/tenantId fields in LogContext
provides:
  - Vitest test suite for webhook-service.ts covering all Redis failure modes and idempotency
  - Shared vi.mock factory pattern with vi.hoisted refs for cross-test mock control
  - Verified test coverage for WHTEST-01, WHTEST-02, WHTEST-03, WHTEST-05, WHTEST-06
affects: [phase-gate-verification, ops-runbook, future-webhook-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for shared mock refs accessible both in vi.mock factory and in individual test blocks"
    - "Regular function (not arrow) in vi.fn() factory to support `new` constructor call pattern"
    - "vi.useFakeTimers() + vi.advanceTimersByTimeAsync() for slow-reject Redis timeout simulation"
    - "result.logs.map(l => JSON.parse(l)).find() for structured log assertions"
    - "vi.stubEnv() with MOLLIE_API_KEY='live_fakekeyfortesting' to bypass demo-mode guard"

key-files:
  created:
    - src/services/webhook-service.test.ts
  modified: []

key-decisions:
  - "vi.fn(function() { return {...}; }) instead of vi.fn(() => ({...})) — arrow functions cannot be called with `new`; regular functions support constructor invocation"
  - "Redis module-level caching (redisChecked flag) handled by vi.mock interception at module load time — no vi.resetModules() needed since mock factory always returns the same mockExists/mockSet/mockDel refs"
  - "MOLLIE_API_KEY stubbed as 'live_fakekeyfortesting' (not 'test_...') to ensure all tests exercise the full Redis/idempotency flow past the demo-mode guard"

patterns-established:
  - "Pattern: vi.hoisted + single vi.mock factory — use this pattern for all future tests that need shared mock state across tests in the same file"
  - "Pattern: fake timers for slow async — vi.useFakeTimers() before Promise creation, vi.advanceTimersByTimeAsync() after, vi.useRealTimers() immediately after assertion"

requirements-completed: [WHTEST-01, WHTEST-02, WHTEST-03, WHTEST-05, WHTEST-06]

# Metrics
duration: 8min
completed: 2026-02-28
---

# Phase 3 Plan 01: Webhook Service Test Suite Summary

**Vitest test suite covering all Redis failure modes (slow-reject, ECONNREFUSED) and idempotency with shared vi.hoisted mock factory and structured log assertions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-28T11:15:00Z
- **Completed:** 2026-02-28T11:23:14Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/services/webhook-service.test.ts` with 3 tests covering WHTEST-01, WHTEST-02, WHTEST-03, WHTEST-05, WHTEST-06
- Verified all 43 tests (3 files) pass with zero failures after adding the new suite
- Discovered and fixed vi.fn arrow function constructor issue (Rule 1 — Bug) during implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook-service.test.ts with shared mock factory and Redis failure tests** - `15ed31b` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/services/webhook-service.test.ts` — Webhook service Vitest test suite: WHTEST-01 (slow timeout via fake timers), WHTEST-02 (ECONNREFUSED immediate rejection), WHTEST-03 (idempotency duplicate delivery), WHTEST-05 (shared vi.hoisted mock factory), WHTEST-06 (structured log assertions for 503 paths)

## Decisions Made

- Used `vi.fn(function() { return {...}; })` instead of `vi.fn(() => ({...}))` for the Redis constructor mock because arrow functions cannot be called with `new`. The webhook-service.ts calls `new Redis({url, token})` and the mock factory must support constructor invocation.
- Redis module-level caching (`redisChecked` flag) works correctly without `vi.resetModules()` because the mock is intercepted at module load time and all tests reuse the same mock instance with per-test `mockReset()` on the shared refs.
- MOLLIE_API_KEY stubbed as `'live_fakekeyfortesting'` (Pitfall 6 from research) — any value starting with `test_` triggers the demo-mode guard in webhook-service.ts, returning `200 'OK (demo)'` without exercising the Redis flow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.fn arrow function not callable as constructor**
- **Found during:** Task 1 (running npm test after initial write)
- **Issue:** `vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => ({...})) }))` — arrow functions are not constructors. `new Redis({url, token})` in webhook-service.ts threw "() => ({...}) is not a constructor"
- **Fix:** Changed to `vi.fn(function() { return {...}; })` — regular functions support `new` invocation
- **Files modified:** src/services/webhook-service.test.ts
- **Verification:** All 3 webhook tests pass, npm test shows 43/43 passing
- **Committed in:** 15ed31b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in mock factory syntax)
**Impact on plan:** Required fix for tests to run at all. No scope creep. Took one iteration.

## Issues Encountered

- Initial vi.fn arrow function in Redis mock factory caused "is not a constructor" error on first test run. Fixed in one iteration by switching to regular function syntax.

## User Setup Required

None - no external service configuration required. Tests run with `npm test` using mocked dependencies only.

## Next Phase Readiness

- All webhook service unit tests green (WHTEST-01, 02, 03, 05, 06)
- Phase 3 plan 01 complete — ready for phase gate verification
- WHTEST-04 (HMAC tampered signature) is covered by the existing `src/lib/logic/webhook-validators.test.ts` file (already present in the repo)
- `npm test` passes with 43/43 tests across 3 test files

## Self-Check: PASSED

- src/services/webhook-service.test.ts: FOUND
- .planning/phases/03-webhook-idempotency-test-suite/03-01-SUMMARY.md: FOUND
- commit 15ed31b: FOUND
- npm test: 43/43 tests passing

---
*Phase: 03-webhook-idempotency-test-suite*
*Completed: 2026-02-28*
