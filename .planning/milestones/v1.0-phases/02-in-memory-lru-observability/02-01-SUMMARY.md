---
phase: 02-in-memory-lru-observability
plan: 01
subsystem: api

tags: [lru-cache, rate-limiting, observability, logging, security, redis]

# Dependency graph
requires:
  - phase: 01-failstrategy-foundation
    provides: checkRateLimit with typed FailStrategy, RateLimitResult, Redis timeout cap

provides:
  - Bounded LRU cache (max=500, ttl=60s) replacing unbounded Map in security.ts
  - Structured JSON logging on every Redis fallback (rate_limit_fallback)
  - Structured JSON logging on every hard-fail 503 return (rate_limit_hard_fail)
  - hashIp() helper for privacy-preserving IP hashing in log output
  - route parameter on checkRateLimit — all 5 callers emit route-identified logs

affects:
  - 03-integration-testing (tests will use updated checkRateLimit signature with route)
  - observability / Vercel log analysis

# Tech tracking
tech-stack:
  added:
    - lru-cache v11.x (LRUCache with max+ttl constructor options)
    - node:crypto (createHash for SHA-256 IP hashing)
  patterns:
    - LRU cache with constructor-level TTL (no per-entry TTL, no ttlAutopurge)
    - emitLog flag pattern: separates Redis-failure logging from local-dev no-op path
    - hashIp() sliced to 16 hex chars: sufficient entropy, GDPR-friendly

key-files:
  created: []
  modified:
    - src/lib/security.ts
    - src/lib/logic/logger.ts
    - src/pages/api/donate.ts
    - src/pages/api/contact.ts
    - src/pages/api/vrijwilligers.ts
    - src/pages/api/evenement-aanmelding.ts
    - src/pages/api/mollie-webhook.ts
    - package.json
    - package-lock.json

key-decisions:
  - "LRUCache constructor-level TTL (ttl: 60_000) — not per-entry set() TTL — since all entries share the same window"
  - "emitLog=false for local dev (no Redis configured) — prevents log noise in development; emitLog=true only on genuine Redis failure"
  - "Log on every fallback activation (allowed AND denied) — RATE-06 requires visibility of all in-memory usage, not just denials"
  - "hashIp sliced to 16 hex chars — sufficient for correlation, not enough to reverse the original IP"
  - "No ttlAutopurge on LRUCache — unnecessary in serverless context (Vercel cold-start resets module state)"

patterns-established:
  - "emitLog flag: checkInMemoryFallback receives boolean — caller context determines whether logging is appropriate"
  - "Structured log context: always includes source, route, hashedIp for rate-limit events"

requirements-completed: [RATE-04, RATE-06]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 02 Plan 01: In-Memory LRU + Observability Summary

**LRU-backed rate-limit cache (max=500, ttl=60s) with SHA-256 IP hashing and structured JSON logs on every Redis fallback and hard-fail path across all 5 API routes**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-28T07:35:48Z
- **Completed:** 2026-02-28T07:37:25Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Replaced unbounded `Map` with `LRUCache` (max=500, ttl=60_000) — memory is now bounded regardless of traffic volume, closing RATE-04
- Added `rate_limit_fallback` and `rate_limit_hard_fail` log events with route + hashed IP — Redis failures are now observable in Vercel logs, closing RATE-06
- Local dev (no Redis configured) passes `emitLog=false` — no spurious fallback log output in development

## Task Commits

Each task was committed atomically:

1. **Task 1: Install lru-cache, extend logger, and refactor security.ts** - `f8491a7` (feat)
2. **Task 2: Update all 5 API callers to pass route parameter** - `023a32b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/security.ts` - LRUCache replacing Map, hashIp(), emitLog flag on checkInMemoryFallback, route param on checkRateLimit, hard-fail logging
- `src/lib/logic/logger.ts` - Added `rate_limit_fallback` and `rate_limit_hard_fail` to LogEvent union
- `src/pages/api/donate.ts` - Passes `'/api/donate'` as 5th arg to checkRateLimit
- `src/pages/api/contact.ts` - Passes `'/api/contact'` as 5th arg to checkRateLimit
- `src/pages/api/vrijwilligers.ts` - Passes `'/api/vrijwilligers'` as 5th arg to checkRateLimit
- `src/pages/api/evenement-aanmelding.ts` - Passes `'/api/evenement-aanmelding'` as 5th arg to checkRateLimit
- `src/pages/api/mollie-webhook.ts` - Passes `'/api/mollie-webhook'` as 5th arg to checkRateLimit
- `package.json` / `package-lock.json` - lru-cache v11.x added as dependency

## Decisions Made

- **LRUCache constructor TTL vs per-entry TTL:** Used constructor-level `ttl: 60_000` since all rate-limit entries share the same 60s window. No per-entry TTL in `set()` calls needed.
- **emitLog flag:** `checkInMemoryFallback` receives `emitLog: boolean` from the caller. The call with Redis configured but failed passes `true`; the no-Redis local dev path passes `false`. This prevents log spam in development while ensuring production visibility.
- **Log on every fallback activation:** Logs both allowed and denied requests during fallback mode — per RATE-06 requirement to observe all in-memory usage, not just denials.
- **route default `'unknown'`:** Backwards-compatible default prevents breaking existing callers while all 5 production callers now pass explicit route strings.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors (14 errors in unrelated .astro component files — DonationCard.astro, VolunteerForm.astro, etc.) were present before this plan and are out of scope per deviation rules. No new errors were introduced in any modified file.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 (integration testing) can now test the updated `checkRateLimit(ip, strategy, max, window, route)` signature
- Vercel log analysis for `rate_limit_fallback` and `rate_limit_hard_fail` events is now possible
- The `hashIp()` helper in security.ts is internal — not exported; if test infrastructure needs it, it must be added there separately

---
*Phase: 02-in-memory-lru-observability*
*Completed: 2026-02-28*
