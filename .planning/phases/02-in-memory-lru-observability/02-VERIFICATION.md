---
phase: 02-in-memory-lru-observability
verified: 2026-02-28T08:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 2: In-Memory LRU + Observability Verification Report

**Phase Goal:** The in-memory fallback is bounded and observable — no unbounded Map growth, every fallback activation emits a structured log entry
**Verified:** 2026-02-28T08:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                    | Status     | Evidence                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 1   | The in-memory rate-limit cache is bounded — cannot grow beyond 500 entries regardless of traffic volume  | VERIFIED   | `security.ts` line 33: `new LRUCache<...>({ max: 500, ttl: 60_000 })` — evicts oldest entries at capacity |
| 2   | Expired rate-limit entries are not returned by the cache (stale reads impossible)                        | VERIFIED   | LRUCache `ttl: 60_000` makes expired entries invisible to `get()` at the library level; secondary guard `if (!entry || now > entry.resetAt)` at line 66 also holds |
| 3   | When Redis fails and the in-memory fallback activates, a structured JSON log line is emitted with source, route, and hashed IP | VERIFIED | `security.ts` lines 129 and 142 call `checkInMemoryFallback(..., true)`; the function emits `formatLog('warn', 'rate_limit_fallback', { source: 'memory', route, hashedIp: hashIp(ip) })` on all three execution branches (new entry, rate-exceeded, count-increment) |
| 4   | When the donate route returns hard-fail 503, a structured JSON log line is emitted with source, route, and hashed IP | VERIFIED | `security.ts` lines 122–127 (catch block) and lines 135–140 (timeout block) both emit `formatLog('warn', 'rate_limit_hard_fail', { source: 'hard-fail', route, hashedIp: hashIp(ip) })` BEFORE the return |
| 5   | Local dev (no Redis configured) does NOT emit fallback log lines — only genuine Redis failures are logged | VERIFIED   | `security.ts` line 149: `checkInMemoryFallback(ip, route, maxRequests, windowMs, false)` — `emitLog: false` suppresses all log calls on the no-Redis code path |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                       | Expected                                              | Status     | Details                                                                               |
| ------------------------------ | ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `src/lib/security.ts`          | LRUCache-backed rate limiting with structured fallback logging | VERIFIED | `LRUCache` import (line 7), `new LRUCache({ max: 500, ttl: 60_000 })` (lines 33–36), `hashIp()` helper (lines 46–48), `checkInMemoryFallback` with `emitLog` flag (lines 56–98), two `formatLog('warn', 'rate_limit_hard_fail', ...)` calls, `route` param on `checkRateLimit` (line 112) |
| `src/lib/logic/logger.ts`      | Two new LogEvent values for rate-limit observability  | VERIFIED   | `'rate_limit_fallback'` (line 25) and `'rate_limit_hard_fail'` (line 26) present in `LogEvent` union |

---

### Key Link Verification

| From                           | To                          | Via                                    | Status   | Details                                                                                       |
| ------------------------------ | --------------------------- | -------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `src/lib/security.ts`          | `lru-cache`                 | `import { LRUCache } from 'lru-cache'` | WIRED    | Line 7 in security.ts; `lru-cache@^11.2.6` present in package.json dependencies              |
| `src/lib/security.ts`          | `src/lib/logic/logger.ts`   | `import { formatLog }`                 | WIRED    | Line 9 in security.ts; `formatLog('warn', 'rate_limit_fallback', ...)` called at lines 69, 80, 91; `formatLog('warn', 'rate_limit_hard_fail', ...)` called at lines 122 and 135 |
| `src/pages/api/donate.ts`      | `src/lib/security.ts`       | `checkRateLimit` with route param      | WIRED    | Line 27: `checkRateLimit(ip, 'hard-fail', 5, 60_000, '/api/donate')` — exact route string passed |
| `src/pages/api/contact.ts`     | `src/lib/security.ts`       | `checkRateLimit` with route param      | WIRED    | Line 22: `checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/contact')`               |
| `src/pages/api/vrijwilligers.ts` | `src/lib/security.ts`     | `checkRateLimit` with route param      | WIRED    | Line 24: `checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/vrijwilligers')`         |
| `src/pages/api/evenement-aanmelding.ts` | `src/lib/security.ts` | `checkRateLimit` with route param   | WIRED    | Line 57: `checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/evenement-aanmelding')`  |
| `src/pages/api/mollie-webhook.ts` | `src/lib/security.ts`    | `checkRateLimit` with route param      | WIRED    | Line 16: `checkRateLimit(ip, 'in-memory-fallback', 20, 60_000, '/api/mollie-webhook')`       |

---

### Requirements Coverage

| Requirement | Source Plan   | Description                                                                                                      | Status    | Evidence                                                                                  |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| RATE-04     | 02-01-PLAN.md | Onbegrensde `rateLimitMap` is vervangen door `LRUCache` met configureerbare `max` entries en `ttl`              | SATISFIED | `security.ts` lines 33–36: `new LRUCache<...>({ max: 500, ttl: 60_000 })` — no bare `Map` remains |
| RATE-06     | 02-01-PLAN.md | Elke fallback of 503 response logt een structured entry met `source`, route, en IP (gehashed)                   | SATISFIED | `formatLog('warn', 'rate_limit_fallback', { source: 'memory', route, hashedIp })` on every fallback invocation; `formatLog('warn', 'rate_limit_hard_fail', { source: 'hard-fail', route, hashedIp })` on both 503 return points |

No orphaned requirements — REQUIREMENTS.md Traceability table maps RATE-04 and RATE-06 exclusively to Phase 2, and both are satisfied.

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, empty return stubs, or console.log-only implementations found in any of the 7 modified files.

---

### Human Verification Required

None. All truths are verifiable from static code analysis:

- LRU boundedness is contractually enforced by the `max: 500` constructor option — no runtime observation needed
- Log emission paths are unconditional within their guard conditions (`emitLog` flag is a boolean set at call site, not runtime-variable)
- The no-Redis path (`emitLog: false`) is a direct code path, not a conditional dependent on environment state

---

### Gaps Summary

No gaps. All five observable truths are fully verified against the actual codebase. Both requirement IDs (RATE-04, RATE-06) are satisfied with direct evidence. All key links are wired. The phase goal is achieved.

---

_Verified: 2026-02-28T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
