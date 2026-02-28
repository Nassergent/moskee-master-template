# Project Research Summary

**Project:** Serverless Security Hardening — Redis Failover + Webhook Idempotency (moskee-master-template)
**Domain:** Serverless API security hardening on an existing Astro 5 / Vercel / Upstash Redis production codebase
**Researched:** 2026-02-28
**Confidence:** HIGH (codebase-verified findings + official library documentation)

## Executive Summary

This milestone targets two specific production security gaps in the existing moskee-master-template platform, neither of which is a greenfield build. The rate limiting layer in `src/lib/security.ts` currently fails open when Upstash Redis is unreachable — meaning the donation route (`/api/donate`) accepts unlimited payment initiations during any Redis outage, exposing the platform to DDoS and billing abuse. Simultaneously, the webhook idempotency pipeline in `src/services/webhook-service.ts` has zero test coverage for four critical failure scenarios (Redis unavailable, Redis timeout, duplicate delivery, and HMAC replay), leaving the team blind to regressions that would cause double-counted donations in Sanity.

The recommended approach is a two-track implementation with a shared dependency. Track 1 hardens the rate limiter by introducing a typed `FailStrategy` per route — `'hard-fail'` for `/api/donate` (returns 503 when Redis is down) and `'in-memory-fallback'` for contact and volunteer routes (degrades gracefully using an `lru-cache`-backed Map). Track 2 adds four Vitest unit tests against `webhook-service.ts` and `mollie-webhook.ts` using `vi.mock('@upstash/redis')` factory mocks with `vi.useFakeTimers()` for timeout simulation. Only one new production dependency is needed: `lru-cache@11` (294M+ weekly downloads, ships TypeScript types, ESM-first).

The central risk is that in-memory fallback is fundamentally per-invocation on Vercel serverless — it cannot provide cross-instance rate limiting. The only safe production fallback for financial routes is a hard 503. Any implementation that appears to "work" locally using a module-scope Map is silently broken in production under concurrent load. This mental model must be established before writing code, not discovered during load testing.

---

## Key Findings

### Recommended Stack

The existing stack (Astro 5, `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.36.2`, `vitest@4.0.18`) already contains all tools needed for this milestone. The `@upstash/ratelimit` library's built-in `timeout` option (default 5000ms, should be set to 500ms explicitly) provides automatic fail-open for transient Redis latency spikes. The `ephemeralCache` option reduces Redis round-trips for already-blocked IPs within a warm invocation but is NOT a Redis-down fallback.

**Core technologies:**
- `@upstash/ratelimit@2.0.8` (existing): Sliding window rate limiting — `timeout` option covers transient Redis latency; NOT sufficient alone for hard-fail requirement
- `@upstash/redis@1.36.2` (existing): REST-based client; throws on network error, enabling controlled catch/fallback logic
- `vitest@4.0.18` (existing): Full mock infrastructure via `vi.mock`, `vi.fn`, `vi.useFakeTimers`, `vi.advanceTimersByTimeAsync`
- `lru-cache@11.2.6` (NEW — only new dependency): In-memory LRU with TTL and bounded size; replaces existing unbounded `rateLimitMap` in `security.ts`

**What NOT to use:**
- `ioredis-mock`: Wrong client, only works with `ioredis` not `@upstash/redis`
- `vi.advanceTimersByTime` (sync variant): Deadlocks when promises are chained with timers — use async variant
- `ephemeralCache` alone as Redis-down fallback: Does not activate when Redis is unreachable, only reduces round-trips for known-blocked IPs

### Expected Features

**Must have (table stakes — closes security gaps):**
- Hard-fail strategy for `/api/donate` — financial route must 503 when Redis unavailable, not silently allow unlimited requests
- In-memory LRU fallback for `/api/contact`, `/api/vrijwilligers`, `/api/evenement-aanmelding` — degrade gracefully for non-financial routes
- Webhook test: Redis completely unavailable (`getRedis()` returns null) — tests the `if (!r) return 503` path with zero current coverage
- Webhook test: Redis timeout during idempotency check — `r.exists()` throws after delay; must use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`
- Webhook test: Duplicate webhook delivery — `r.exists()` returns 1 on second call; asserts `'Already processed'` and zero Sanity patch calls
- Webhook test: HMAC replay/forgery — pure unit test of `verifyHmacTimingSafe()` in `webhook-validators.ts`; no Redis or HTTP needed

**Should have (ship in same PR if time allows):**
- Structured log emission when in-memory fallback activates — emits `source: 'in_memory_fallback'` + route ID via existing `formatLog()` in `logger.ts`
- Typed result object from `checkRateLimit()` — replaces bare boolean with `{ allowed: boolean, source: 'redis' | 'memory' | 'hard-fail' }` for explicit observability

**Defer (v2+):**
- Timestamp-based HMAC replay window — requires confirming Mollie includes a timestamp in the signed webhook payload (unconfirmed; do not assume)
- LRU size cap on in-memory fallback — only relevant for non-serverless deployments; low urgency on current Vercel fleet
- Sentry / monitoring integration — separate fleet-wide dependency decision; out of scope per PROJECT.md
- Async / queued webhook processing — requires QStash or equivalent; separate milestone

### Architecture Approach

The architecture is a surgical modification to two existing files (`src/lib/security.ts` and test additions) with a clear 6-step build order. The FailStrategy type and `checkRateLimit()` signature change is the single shared dependency that must be built first, unblocking all route updates and the LRU implementation. Webhook tests (Steps 4 and 5) are fully independent and can be written in parallel with the rate limiter work. No new routes, services, or Sanity schemas are added. The `webhook-service.ts` itself requires no production code changes — only test coverage.

**Major components:**
1. `src/lib/security.ts` — MODIFY: add `FailStrategy` type, per-route strategy lookup, `lru-cache` integration, catch block around `ratelimit.limit()` call
2. `src/pages/api/donate.ts`, `contact.ts`, `vrijwilligers.ts` — MODIFY callers: pass `strategy: 'hard-fail'` or `'in-memory'` to updated `checkRateLimit()`
3. `src/services/webhook-service.ts` — NO CHANGE; already correct hard-fail behavior; add test coverage only
4. `tests/webhook-service.test.ts` (NEW) — 4 Redis failure scenario tests using `vi.mock('@upstash/redis')` factory
5. `tests/mollie-webhook-route.test.ts` (NEW) — HMAC forgery/replay test calling exported `POST` handler directly
6. `src/lib/logic/lru-cache.ts` (optional NEW) — Extracted `InMemoryRateLimiter` class for testability isolation

### Critical Pitfalls

1. **In-memory Map fallback is per-invocation, not per-process** — A module-scope `Map` resets on every Vercel cold start. 50 concurrent requests across 10 cold invocations bypass the limit entirely. Hard fail is the only safe production strategy for financial routes. In-memory is acceptable only for contact/volunteer forms and must be documented as coarse, per-instance protection.

2. **Single shared `Ratelimit` instance ignores per-route config** — `@upstash/ratelimit` bakes the algorithm and window into the constructor. Passing `maxRequests` to `checkRateLimit()` only affects the in-memory fallback path; the Redis path always uses the constructor-time limit (currently hardcoded at 5/min). Per-route rate limits require separate named `Ratelimit` instances, not a single shared one with variable call-site parameters.

3. **Redis timeout is not the same as Redis unavailable in tests** — A synchronous `vi.fn().mockRejectedValue()` simulates a hard crash, not a network hang. The most dangerous production failure is a slow Redis timeout that holds the Vercel invocation slot open while Mollie fires a retry. Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` to simulate the slow-reject path. The async timer variant is mandatory — the sync variant deadlocks.

4. **Webhook 503 assumes Mollie will retry — no recovery path documented** — Mollie retries on non-2xx responses, but the retry window is finite and not guaranteed. If Redis is down beyond the retry window, payments are silently unprocessed in Sanity. Every 503 path must emit a structured log with `paymentId` and `tenantId` so ops can identify payments needing manual reconciliation.

5. **HMAC replay test often covers forgery, not replay** — A test that sends a tampered signature only proves HMAC validation works (forgery protection). A replay test must send the same valid body and signature twice, with the idempotency key mocked correctly. The second call should hit the `r.exists() === 1` branch and return `'Already processed'` — the Redis idempotency key IS the replay defense, not a timestamp check.

---

## Implications for Roadmap

Based on research, the build order is well-defined by code dependencies. Two independent tracks can proceed in parallel after the shared `FailStrategy` type is established.

### Phase 1: FailStrategy Foundation
**Rationale:** This is the single shared dependency. `checkRateLimit()` signature change must land before any route updates or the LRU implementation. Doing it first prevents rework across callers.
**Delivers:** `FailStrategy` type (`'hard-fail' | 'in-memory'`), updated `checkRateLimit()` signature with try/catch around `ratelimit.limit()`, updated callers in `donate.ts`, `contact.ts`, `vrijwilligers.ts`
**Addresses:** Hard-fail for donate route (P1), in-memory fallback route selection (P1)
**Avoids:** Pitfall 2 (single shared instance), Pitfall 1 (in-memory bypass documented and scoped)
**Research flag:** Standard patterns — no additional research needed. Pattern is fully specified in research files.

### Phase 2: In-Memory LRU Implementation
**Rationale:** Depends on Phase 1 (FailStrategy type must exist). Replaces the existing unbounded `rateLimitMap` with a proper `LRUCache` instance. Addresses the memory-leak risk in Vercel Fluid Compute (long-lived warm invocations).
**Delivers:** `lru-cache@11` installed, `LRUCache`-backed `inMemoryCheck()` in `security.ts` with TTL and bounded size (max 1000 entries), structured log emission on fallback activation
**Uses:** `lru-cache@11.2.6` (ESM named import `{ LRUCache }`), existing `formatLog()` from `logger.ts`
**Implements:** In-memory LRU layer (component boundary from ARCHITECTURE.md)
**Avoids:** Pitfall 1 (unbounded Map growth), fleet isolation issue (key as `${tenantId}:${ip}`)
**Research flag:** Standard patterns — lru-cache API is well-documented. No research-phase needed.

### Phase 3: Webhook Idempotency Test Suite
**Rationale:** Fully independent of Phases 1-2 (can run in parallel). `webhook-service.ts` requires no production code changes. All four test scenarios share the same `vi.mock('@upstash/redis')` factory setup — build the mock infrastructure once.
**Delivers:** `tests/webhook-service.test.ts` (3 Redis scenarios) + `tests/mollie-webhook-route.test.ts` (1 HMAC scenario)
**Addresses:** All P1 webhook test features from FEATURES.md
**Avoids:** Pitfall 3 (Redis timeout correctly simulated with `vi.useFakeTimers()`), Pitfall 5 (replay test hits idempotency path, not just forgery check), `r.set` NX mock returns `'OK'`/`null` not `true`/`false`
**Research flag:** Vitest mocking patterns are well-documented (HIGH confidence). One nuance needs attention during implementation: `vi.mock` hoisting requires `vi.hoisted()` for variables referenced inside factory — documented in Vitest official docs.

### Phase 4: Observability and Hardening Verification
**Rationale:** Final pass to ensure the 503 hard-fail path is observable in production. Without structured logs on the failure paths, a Redis outage produces silent payment loss risk.
**Delivers:** Structured log entries on every 503 path (including `paymentId`, `tenantId`, `step`), verification that `r.set` with `nx: true` lock-acquire is never called before Redis availability confirmed, "looks done but isn't" checklist items verified
**Uses:** Existing `formatLog()` from `src/lib/logic/logger.ts`
**Avoids:** Pitfall 4 (503 with no recovery path), security mistake (Redis error details never leaked to response body)
**Research flag:** Standard patterns — no research-phase needed. Verification is code review + test assertion work.

### Phase Ordering Rationale

- Phase 1 must precede Phase 2 because `FailStrategy` type is required by the LRU implementation call sites
- Phase 3 is fully independent and can proceed in parallel with Phases 1-2 — assign to a separate developer if available
- Phase 4 is a verification pass, not a build phase — it should be done as a final review step, not a separate sprint
- The entire milestone can ship as one PR if done sequentially, or two PRs (Phases 1-2 and Phase 3 separately) if developed in parallel

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (FailStrategy):** Fully specified in ARCHITECTURE.md with working code examples. Pattern is established (OWASP, payment security standards).
- **Phase 2 (LRU):** `lru-cache@11` API is well-documented. The only implementation decision (inline vs extracted module) is a style preference, not a research question.
- **Phase 4 (Observability):** Logger usage pattern already established in `webhook-service.ts`. No new patterns needed.

Phases needing attention during implementation (not pre-research, but careful reading):
- **Phase 3 (Webhook tests):** `vi.mock` hoisting and `vi.hoisted()` pattern is a known gotcha (Pitfall: variables defined before mock call are `undefined` inside factory). Read Vitest hoisting docs before writing the first test file. Also: confirm Astro exports `POST` from `mollie-webhook.ts` as a directly-callable async function before writing the route-level HMAC test.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing packages verified via `package.json`. `lru-cache@11` version and ESM API confirmed via jsDocs.io. Only one new dependency. |
| Features | HIGH | Requirements derived from direct codebase inspection of `security.ts` and `webhook-service.ts`. P1/P2/P3 priorities are clear and non-overlapping. |
| Architecture | HIGH | Based on reading actual source files, not training data assumptions. Build order is dependency-driven, not arbitrary. |
| Pitfalls | MEDIUM-HIGH | In-memory serverless isolation (Pitfall 1) is HIGH — Vercel docs confirm. Mollie retry window specifics (Pitfall 4) are LOW — community sources only, no official Mollie documentation confirmed the exact retry schedule. |

**Overall confidence:** HIGH

### Gaps to Address

- **Mollie retry window duration:** Mollie's exact retry schedule for non-2xx responses is confirmed "up to ~24 hours" from community sources only (LOW confidence). Official Mollie docs were unavailable via fetch. Before Phase 4, confirm the retry window in Mollie's official documentation so the ops runbook documents accurate recovery time estimates. This does not block implementation — the 503 strategy is correct regardless of exact retry timing.

- **Mollie timestamp-in-signature:** FEATURES.md flags that timestamp-based HMAC replay window requires verifying that Mollie includes a timestamp in the signed webhook payload. This is unconfirmed. Do NOT implement a timestamp check without this verification — it would break HMAC validation. Deferred to v2+.

- **Astro `POST` export callability:** The route-level HMAC test (Phase 3) assumes Astro exports the `POST` handler as a directly-callable async function without needing the full Astro runtime. Confirm this in the first lines of Phase 3 implementation before writing the test.

- **Per-route Ratelimit instances:** Research identifies that the current single shared `Ratelimit` instance ignores `maxRequests` in the Redis path. This is a moderate technical debt item noted in PITFALLS.md (Pitfall 2). It is not a regression introduced by this milestone, but the FailStrategy refactor in Phase 1 is the natural moment to fix it. Decide during Phase 1 implementation whether to create named per-route instances or document the mismatch explicitly and defer.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/lib/security.ts`, `src/services/webhook-service.ts`, `src/pages/api/donate.ts`, `src/pages/api/mollie-webhook.ts` — current behavior confirmed
- Vitest official docs (vi.mock, vi.hoisted, vi.useFakeTimers, advanceTimersByTimeAsync): https://vitest.dev/guide/mocking
- OWASP API Top 10 / APIsec 2025 — hard-fail for payment rate limits: https://www.apisec.ai/blog/api-security-testing-payment-systems
- Vercel serverless memory isolation (stateless per invocation): https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel

### Secondary (MEDIUM confidence)
- lru-cache@11.2.6 API documentation: https://www.jsdocs.io/package/lru-cache
- Upstash Ratelimit features (timeout, ephemeralCache): https://upstash.com/docs/redis/sdks/ratelimit-ts/features
- Upstash ratelimit-js GitHub (ephemeralCache per-invocation isolation): https://github.com/upstash/ratelimit-js
- Vercel warm invocation state retention (99.37% avoid cold starts): https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts
- webhooks.fyi replay prevention (300s timestamp window standard): https://webhooks.fyi/security/replay-prevention
- Hookdeck webhook idempotency patterns: https://hookdeck.com/webhooks/guides/implement-webhook-idempotency
- Gravitee rate limiting fail strategies: https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies

### Tertiary (LOW confidence)
- Mollie webhook retry behavior (community-sourced, official docs unavailable): https://github.com/mollie/mollie-api-php/blob/master/docs/recipes/payments/handle-webhook.md — exact retry schedule unconfirmed; needs validation against official Mollie documentation

---

*Research completed: 2026-02-28*
*Ready for roadmap: yes*
