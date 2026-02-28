---
phase: 01-failstrategy-foundation
plan: 01
subsystem: api
tags: [rate-limiting, upstash, redis, typescript, fail-strategy, security]

# Dependency graph
requires: []
provides:
  - "checkRateLimit() with typed FailStrategy parameter and RateLimitResult return type"
  - "Hard-fail rate limiting on donate route (HTTP 503 when Redis unavailable)"
  - "In-memory-fallback rate limiting on contact/vrijwilligers/evenement/webhook routes"
  - "Redis latency bounded to 500ms via Ratelimit timeout option"
affects:
  - "02-memoryleak-fix"
  - "03-webhook-hardening"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FailStrategy discriminated union: 'hard-fail' | 'in-memory-fallback' as required parameter"
    - "RateLimitResult return type with source field to differentiate 503 (unavailable) from 429 (rate limited)"
    - "Redis unavailability detection via both try/catch (connection refused) and reason==='timeout'"
    - "checkInMemoryFallback() private function reused across Redis-unavailable and no-Redis paths"

key-files:
  created: []
  modified:
    - "src/lib/security.ts"
    - "src/pages/api/donate.ts"
    - "src/pages/api/contact.ts"
    - "src/pages/api/vrijwilligers.ts"
    - "src/pages/api/evenement-aanmelding.ts"
    - "src/pages/api/mollie-webhook.ts"

key-decisions:
  - "donate route uses 'hard-fail': financial route must return 503 when Redis unavailable rather than silently allowing all requests through"
  - "contact/vrijwilligers/evenement/webhook routes use 'in-memory-fallback': non-financial routes degrade gracefully with no 503"
  - "failStrategy is required parameter (not optional with default): TypeScript enforces correct usage at every call site — no silent misconfiguration possible"
  - "timeout: 500ms on Ratelimit constructor: caps Redis latency per RATE-05, preventing Vercel slot starvation during Redis spikes"
  - "evenement-aanmelding.ts and mollie-webhook.ts were undocumented additional callers auto-fixed per Rule 3 with 'in-memory-fallback'"

patterns-established:
  - "FailStrategy pattern: all checkRateLimit callers must explicitly declare their Redis-unavailability behavior at compile time"
  - "RateLimitResult.source field: callers check source==='hard-fail' to differentiate service-unavailable (503) from rate-limited (429)"

requirements-completed: [RATE-01, RATE-02, RATE-03, RATE-05]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 1 Plan 01: FailStrategy Foundation Summary

**Typed per-route Redis fail-strategy for checkRateLimit(): donate hard-fails (503), non-financial routes degrade to in-memory fallback, with 500ms Redis timeout cap**

## Performance

- **Duration:** ~10 min (including type check tooling install)
- **Started:** 2026-02-28T~09:15Z
- **Completed:** 2026-02-28
- **Tasks:** 2 (+ 1 auto-fix deviation)
- **Files modified:** 6

## Accomplishments

- `FailStrategy` type and `RateLimitResult` interface exported from `security.ts` — compile-time enforcement of correct caller behavior
- `checkRateLimit()` now requires `failStrategy` as second parameter — omitting it causes a TypeScript error
- `timeout: 500` added to Ratelimit constructor — Redis latency spikes capped at 500ms (was 5000ms default)
- Redis unavailability handled in both `try/catch` (connection refused) and `reason === 'timeout'` (timeout response) branches
- `donate.ts` returns HTTP 503 with JSON error when Redis unavailable — closes production security gap
- `contact.ts` and `vrijwilligers.ts` silently fall back to in-memory rate limiting — no degradation in user experience
- All 5 callers (including 2 undiscovered ones) updated to new signature

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2 (combined): Refactor security.ts and update all callers** - `26d3764` (feat)

_Note: Tasks 1 and 2 were committed together because changing the return type in Task 1 immediately breaks all callers — a partial commit would have left the repo in a broken TypeScript state. The research document documented this as expected behavior (Pitfall 3)._

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/lib/security.ts` - Added FailStrategy type, RateLimitResult interface, required failStrategy parameter, timeout:500, checkInMemoryFallback() private function, full Redis unavailability handling
- `src/pages/api/donate.ts` - Updated to 'hard-fail' strategy: 503 when Redis unavailable, 429 when rate limited
- `src/pages/api/contact.ts` - Updated to 'in-memory-fallback' strategy: 429 only, no 503 possible
- `src/pages/api/vrijwilligers.ts` - Updated to 'in-memory-fallback' strategy: 429 only
- `src/pages/api/evenement-aanmelding.ts` - Auto-fixed: updated to 'in-memory-fallback' strategy (was undocumented caller)
- `src/pages/api/mollie-webhook.ts` - Auto-fixed: updated to 'in-memory-fallback' strategy (was undocumented caller)

## Decisions Made

- `donate` route uses `'hard-fail'`: financial route must never silently allow all requests through when Redis is unavailable
- Non-financial routes use `'in-memory-fallback'`: graceful degradation preferred over hard failure for contact/event/volunteer/webhook routes
- `failStrategy` is required (not optional): any default would defeat RATE-01 — callers must explicitly declare their intent
- `timeout: 500ms`: chosen per research doc recommendation; the default 5000ms could hold Vercel serverless slots open during Redis incidents

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two undocumented callers of checkRateLimit() required signature update**
- **Found during:** Task 2 verification (`npx astro check`)
- **Issue:** `src/pages/api/evenement-aanmelding.ts` and `src/pages/api/mollie-webhook.ts` called `checkRateLimit(ip, 3, 60_000)` and `checkRateLimit(ip, 20, 60_000)` — old boolean signature. Both produced TypeScript error TS2345 ("Argument of type 'N' is not assignable to parameter of type 'FailStrategy'"). The research document's grep stated only 3 callers existed, but 5 existed in the actual codebase.
- **Fix:** Updated both files to use `'in-memory-fallback'` strategy (appropriate for non-financial, non-donate routes)
- **Files modified:** `src/pages/api/evenement-aanmelding.ts`, `src/pages/api/mollie-webhook.ts`
- **Verification:** `npx astro check` showed 0 errors in our 6 modified files after fix (14 remaining errors all pre-existing in unrelated files)
- **Committed in:** `26d3764` (included in task commit)

---

**Total deviations:** 1 auto-fixed (blocking — undiscovered callers)
**Impact on plan:** Necessary for correctness. Both undiscovered callers now have explicit fail-strategies. Mollie webhook using `'in-memory-fallback'` is intentional — webhook availability is preferred over hard failure for payment status updates.

## Issues Encountered

- `@astrojs/check` was not installed in the project — `npx astro check` prompted for installation, which was accepted automatically. Subsequent checks ran normally.
- Pre-existing TypeScript errors (14 errors in DonationCard, VolunteerForm, contact.astro, diensten.astro, nieuws.astro) exist in the codebase but are out-of-scope — none in our modified files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FailStrategy pattern is established and enforced at compile time — Phase 2 (memory leak fix) can build on this foundation
- Phase 3 (webhook hardening) will interact with `mollie-webhook.ts` — its `'in-memory-fallback'` strategy is now explicit and documented
- Pre-Phase 3 blocker remains: confirm Astro exports `POST` handler from `mollie-webhook.ts` as callable function for route-level HMAC testing

---
*Phase: 01-failstrategy-foundation*
*Completed: 2026-02-28*
