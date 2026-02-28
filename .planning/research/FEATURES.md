# Feature Research

**Domain:** Serverless security hardening — Redis rate limiting failover + webhook idempotency
**Researched:** 2026-02-28
**Confidence:** HIGH (codebase verified + official library docs + industry standard patterns)

---

## Context

This is a subsequent milestone on an existing codebase. The security primitives already exist:
- HMAC signature validation on Mollie webhook — **existing**
- Redis-based rate limiting on donate / contact / volunteer routes — **existing**
- Webhook idempotency via Upstash Redis (processed key + processing lock) — **existing**
- CSRF origin check via custom `checkOrigin()` — **existing**
- Structured logger — **existing**
- 38 prayer engine unit tests with Vitest — **existing**

The two production risks from CONCERNS.md that this milestone addresses:
1. Rate limiting in `src/lib/security.ts` **fails open** when Redis is unavailable — no rejection, full DDoS exposure
2. Webhook idempotency in `src/services/webhook-service.ts` has **zero test coverage** for failure scenarios

---

## Feature Landscape

### Table Stakes (System Is Vulnerable Without These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Per-route fail strategy: hard fail (503) for donation route** | Donation route (`/api/donate`) has financial impact. A fail-open rate limiter means unlimited payment initiations during Redis outage, enabling abuse and cost attack | MEDIUM | Change `checkRateLimit()` return value from `true` to throw/503 when Redis unavailable AND no acceptable fallback. Requires route-level config object passed to `checkRateLimit()`. Current code in `src/lib/security.ts` lines 41-44 always returns `success` from Redis — if Redis throws, the try/catch at init time silently skips to in-memory. The in-memory fallback is per-invocation on Vercel (no shared state), so it provides zero actual limiting in production. |
| **Per-route fail strategy: in-memory LRU fallback for contact / volunteer routes** | Contact and volunteer forms have no financial impact. Hard-failing them during Redis outage degrades user experience unnecessarily. An in-memory fallback per invocation still provides partial protection (prevents abuse within a single cold start's lifetime) | MEDIUM | Implement LRU cache as explicit fallback (not silent catch). `@upstash/ratelimit` exposes `ephemeralCache` option (a `Map<string, number>`) that reduces Redis calls for already-blocked IPs — not a substitute for Redis-down scenario. Manual in-memory fallback with TTL is the correct pattern for that case. |
| **Webhook idempotency test: Redis timeout scenario** | The webhook service returns 503 on Redis error (line 91 in `webhook-service.ts`). This is correct behavior but completely untested. Mollie does NOT retry on 503 by default — if 503 is returned incorrectly, payments are lost silently | HIGH | Mock `r.exists()` to throw with a network timeout error. Assert result is `{ status: 503, body: 'Service temporarily unavailable' }`. Uses `vi.fn()` to mock the Redis client method. |
| **Webhook idempotency test: Redis completely unavailable** | `getRedis()` returns `null` when env vars missing. The `if (!r)` guard on line 76 returns 503. Without this test, a misconfigured deployment (missing `UPSTASH_REDIS_REST_URL`) would silently break all webhook processing | LOW | Mock env vars to be undefined. Assert `processWebhook()` returns 503 with `step: 'redis_required'` in logs. Already a clear code path — just needs test coverage. |
| **Webhook idempotency test: duplicate webhook (same payment ID received twice)** | Mollie delivers webhooks at-least-once. The `r.exists()` check on line 83 prevents double-processing. Without a test, a regression in idempotency logic would cause double-increments in Sanity (donation amounts counted twice) | MEDIUM | First call: mock Redis as empty (exists returns 0), proceed normally, set processed key. Second call: mock Redis `exists` to return 1. Assert second call returns `{ status: 200, body: 'Already processed' }`. |
| **Webhook idempotency test: HMAC replay attack (duplicate/expired signature)** | The `verifyHmacTimingSafe()` call in `mollie-webhook.ts` (line 36) is the first defense. Without replay test coverage, a regression in HMAC logic could allow replayed webhook requests | MEDIUM | This test lives at the API route level (not webhook-service). Mock a valid body with an old/reused signature. Assert 401 response. Tests `verifyHmacTimingSafe()` in `src/lib/logic/webhook-validators.ts` directly — this can be a pure unit test without HTTP. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Configurable fail strategy as typed enum per route** | Route authors can declare `failStrategy: 'hard-fail' \| 'in-memory-fallback'` at the call site. This makes security intent explicit and reviewable in code — not hidden in conditional logic | LOW | Replace the current boolean return from `checkRateLimit()` with a result object `{ allowed: boolean, source: 'redis' \| 'memory' \| 'fail-open' }`. Callers decide what to do. Self-documenting in code review. |
| **In-memory LRU with window-aware TTL (not just Map)** | A bare `Map<string, {count, resetAt}>` grows unbounded in long-lived processes. An LRU-bounded map (max 1000 entries, evict LRU on overflow) prevents memory leak in non-serverless environments (local dev, future containerized deployments) | LOW | Either use a tiny LRU library or implement a simple Map with size cap and eviction. No new production dependency needed — implement inline. Upstash's `ephemeralCache` is a plain `Map` and has the same issue, but their invocations are short-lived. |
| **Structured log emission on fallback activation** | When the in-memory fallback activates (Redis unavailable), emit a structured log event with `source: 'in_memory_fallback'` and the route identifier. This makes Redis outages visible in Vercel logs without requiring Sentry | LOW | Leverage existing `formatLog()` from `src/lib/logic/logger.ts`. Already used in webhook-service — extend usage to security.ts. |
| **Timestamp-based replay window in HMAC validation** | Industry standard: reject webhooks where the signature timestamp is older than 5 minutes. Mollie's HMAC currently has no timestamp validation in `verifyHmacTimingSafe()`. Adding it closes the replay window | MEDIUM | Requires Mollie to include timestamp in the signed payload — verify this is the case in Mollie's webhook spec before implementing. If Mollie does not include timestamp in the signature digest, this is not implementable without breaking HMAC verification. **Flag for phase research.** |

### Anti-Features (Deliberately NOT Build)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Shared in-memory rate limit state across invocations** | "Real" rate limiting needs shared state to be accurate | Vercel serverless gives each invocation fresh memory. Shared memory requires a long-lived process (not serverless). Any attempt to fake this (global module-level Map) is misleading — it works in local dev but provides zero protection in production where each cold start resets state | Accept the limitation: in-memory fallback is coarse protection only. Document it clearly. Route authors using `hard-fail` for financial routes avoid this problem entirely. |
| **Redis circuit breaker (stop retrying Redis for N seconds)** | Prevents repeated Redis connection failures from adding latency | On Vercel serverless, each invocation is independent — there is no persistent process to hold circuit breaker state. A module-level variable resets on cold start. A Redis-based circuit breaker is circular (Redis is down, you can't update Redis). | Use the `timeout` option in `@upstash/ratelimit` (5s default). If Redis doesn't respond in 5s, the library treats it as pass. This is the intended mechanism. |
| **Full idempotency without Redis (in-memory dedup on Vercel)** | "What if we use a module-level Set to track processed IDs?" | Module-level state on Vercel does NOT persist across invocations. A Set of processed payment IDs resets on every cold start. Mollie retries after 503 — so a correctly-implemented Redis-hard-fail is safer than a false sense of in-memory dedup. | Keep the current correct behavior: `if (!r) return 503`. Test this code path. Make it explicit in docs. |
| **Sentry / monitoring integration in this milestone** | Alerting on Redis failures is valuable | Out of scope per PROJECT.md. Adding Sentry SDK is a separate dependency decision with fleet-wide impact. | Use structured logging to Vercel logs (already available). Monitoring integration is a separate milestone. |
| **Async / queued webhook processing** | Prevents Mollie webhook timeout issues under load | Requires a queue system (Upstash QStash or similar), new dependency, new infrastructure. Out of scope for this security hardening milestone. | Accept synchronous processing for now. Scaling is a separate milestone concern. |

---

## Feature Dependencies

```
[Per-route fail strategy config]
    └──requires──> [checkRateLimit() returns typed result, not bool]
                       └──enables──> [route-level 503 vs fallback decision]

[In-memory LRU fallback]
    └──requires──> [checkRateLimit() has explicit fallback path]
    └──enhances──> [Per-route fail strategy config]

[Webhook test: Redis unavailable]
    └──requires──> [Vitest + vi.mock setup for @upstash/redis]

[Webhook test: duplicate webhook]
    └──requires──> [Vitest + vi.mock setup for @upstash/redis]
    └──depends-on──> [Webhook test: Redis unavailable] (same mock infrastructure)

[Webhook test: Redis timeout]
    └──requires──> [Vitest + vi.mock setup for @upstash/redis]
    └──depends-on──> [Webhook test: Redis unavailable] (same mock infrastructure)

[Webhook test: HMAC replay]
    └──requires──> [verifyHmacTimingSafe() is pure/testable without HTTP]
    └──independent──> [Redis mock tests]
```

### Dependency Notes

- **All webhook tests share the same mock infrastructure:** Set up `vi.mock('@upstash/redis')` once in a test file, then configure per-test with `vi.mocked(Redis).mockImplementation(...)`. Build this once, run 3 tests against it.
- **Per-route fail strategy requires API change:** `checkRateLimit()` currently returns `Promise<boolean>`. Changing to a result object is a breaking change to all callers (donate.ts, contact.ts, vrijwilligers.ts, mollie-webhook.ts). All 4 files need updating — straightforward but must be done atomically.
- **HMAC replay test is independent:** `verifyHmacTimingSafe()` is a pure function (takes secret, body, signature as strings). No HTTP or Redis mock needed. Easiest test to write, highest signal-to-noise.

---

## MVP Definition

### Launch With (v1 — this milestone)

- [ ] **Hard-fail strategy for donate route** — prevents DDoS / billing attack when Redis down. Financial risk is the highest priority.
- [ ] **In-memory LRU fallback for contact/volunteer routes** — degrades gracefully without breaking non-financial user flows.
- [ ] **Webhook test: Redis unavailable** — covers the `if (!r) return 503` code path that currently has zero test coverage.
- [ ] **Webhook test: duplicate webhook** — covers idempotency core contract; regression here = money counted twice.
- [ ] **Webhook test: Redis timeout** — covers the `r.exists()` throw path (line 88-92 in webhook-service.ts).
- [ ] **Webhook test: HMAC replay** — covers the `verifyHmacTimingSafe()` call; pure unit test, low cost, high value.

### Add After Validation (v1.x)

- [ ] **Structured log on fallback activation** — once the fallback is in place and tested, add the log event. Trigger: first production Redis outage detected via logs.
- [ ] **Typed result object from checkRateLimit()** — after v1 ships and is stable. Makes intent explicit. Trigger: next security review.

### Future Consideration (v2+)

- [ ] **Timestamp-based HMAC replay window** — requires verifying Mollie webhook spec supports timestamp-in-signature. Research first.
- [ ] **LRU size cap on in-memory fallback** — only matters in non-serverless deployments. Low urgency for current Vercel fleet.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hard-fail for donate route | HIGH (financial safety) | LOW (change return behavior, update 1 caller) | P1 |
| Webhook test: Redis unavailable | HIGH (reveals misconfiguration) | LOW (1 test, clear code path) | P1 |
| Webhook test: duplicate webhook | HIGH (idempotency regression = money bug) | MEDIUM (Redis mock setup) | P1 |
| Webhook test: Redis timeout | HIGH (untested error path) | MEDIUM (same Redis mock as above) | P1 |
| Webhook test: HMAC replay | HIGH (replay = unauthorized payment trigger) | LOW (pure function test) | P1 |
| In-memory LRU fallback for contact/volunteer | MEDIUM (UX degrades without it) | MEDIUM (implement LRU Map + fallback logic) | P2 |
| Structured log on fallback | MEDIUM (observability) | LOW (extend existing logger usage) | P2 |
| Typed result object from checkRateLimit() | LOW (developer ergonomics) | MEDIUM (API change + 4 callers) | P3 |

**Priority key:**
- P1: Must have for this milestone (security gaps closed)
- P2: Should have, add in same PR if time allows
- P3: Nice to have, future consideration

---

## How These Features Actually Work

### Redis Rate Limiting Failover

**Current behavior (the problem):**
```typescript
// src/lib/security.ts — current code (simplified)
// Redis init happens once at module load time.
// If Redis credentials missing → ratelimit = null → falls through to in-memory.
// If Redis credentials present but Redis DOWN at request time → ratelimit.limit() throws
// → unhandled → exception propagates → 500 (not a controlled 503).
// The try/catch is only around INIT, not around the .limit() call itself.

export async function checkRateLimit(ip: string): Promise<boolean> {
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip); // ← throws if Redis down at runtime
    return success;
  }
  // In-memory path — this is per-invocation on Vercel, zero protection in prod
  return inMemoryCheck(ip);
}
```

**Target behavior:**
```typescript
type FailStrategy = 'hard-fail' | 'in-memory-fallback';

export async function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
  failStrategy: FailStrategy = 'in-memory-fallback'
): Promise<boolean> {
  if (ratelimit) {
    try {
      const { success } = await ratelimit.limit(ip);
      return success;
    } catch {
      // Redis unavailable at request time
      if (failStrategy === 'hard-fail') {
        return false; // Caller maps false → 503
      }
      // fall through to in-memory
    }
  }
  return inMemoryCheck(ip, maxRequests, windowMs);
}
```

Callers:
- `donate.ts`: passes `failStrategy: 'hard-fail'` → `false` → returns 503
- `contact.ts`, `vrijwilligers.ts`: passes `failStrategy: 'in-memory-fallback'` → in-memory check

**Key insight from Upstash docs:** `@upstash/ratelimit` has a built-in `timeout` option (default 5s) — if Redis doesn't respond within 5s, the request is allowed through (fail-open). The `ephemeralCache` option (a `Map`) reduces Redis calls for already-blocked IPs but does NOT substitute for Redis being down. The library's own failover is always fail-open; our wrapper adds the fail-closed option for financial routes.

### Per-Route Configurable Fail Strategies

Three distinct scenarios, three distinct behaviors:

| Route | Financial? | Redis down behavior | Rationale |
|-------|-----------|---------------------|-----------|
| `/api/donate` | YES | 503 Service Unavailable | Better to reject than allow unbounded payment creation |
| `/api/mollie-webhook` | YES (idempotency not rate limiting) | Redis required (existing hard fail at service level) | Webhook already returns 503 when Redis unavailable |
| `/api/contact` | NO | In-memory fallback (coarse) | Form submission failure is bad UX, abuse risk is low |
| `/api/vrijwilligers` | NO | In-memory fallback (coarse) | Same as contact |
| `/api/evenement-aanmelding` | NO | In-memory fallback (coarse) | Same as contact |

### Webhook Idempotency Test Scenarios

**Scenario 1 — Redis completely unavailable (env vars missing):**
```typescript
// Mock: no Redis env vars
// processWebhook('tr_test123') called
// getRedis() returns null
// Expected: { status: 503, body: 'Service temporarily unavailable' }
// Expected log: step: 'redis_required'
```

**Scenario 2 — Redis timeout during idempotency check:**
```typescript
// Mock: Redis initialized, but r.exists() rejects with network error
// processWebhook('tr_test123') called
// r.exists() throws → caught at line 88
// Expected: { status: 503, body: 'Service temporarily unavailable' }
// Expected log: step: 'idempotency_check'
```

**Scenario 3 — Duplicate webhook (same payment ID twice):**
```typescript
// First call: r.exists() returns 0 (not yet processed)
// → processes payment, sets r.set('processed:tr_test123', ...)
// Second call: r.exists() returns 1 (already processed)
// Expected: { status: 200, body: 'Already processed' }
// Expected log: 'already_processed' event
```

**Scenario 4 — HMAC replay attack:**
```typescript
// verifyHmacTimingSafe(secret, body, reusedSignature) called with old/reused signature
// Expected: returns false
// At route level (mollie-webhook.ts): false → 401 'Invalid signature'
// This is a pure unit test of webhook-validators.ts — no Redis, no HTTP needed
```

---

## Competitor / Industry Reference

| Security Feature | Stripe | Mollie | This Platform |
|-----------------|--------|--------|---------------|
| Webhook HMAC signature | Yes (svix-based) | Yes (x-mollie-signature) | Existing |
| Timestamp in HMAC digest | Yes (5-min window) | Not confirmed — needs research | Not implemented |
| Idempotency via Redis | Yes (idempotency keys) | N/A (consumer responsibility) | Existing |
| Rate limiting | Stripe-side | N/A (consumer responsibility) | Existing |
| Redis failover for rate limit | N/A (Stripe handles) | N/A | Gap — this milestone |
| Webhook idempotency tests | (internal) | N/A | Gap — this milestone |

---

## Sources

- Upstash Ratelimit documentation (ephemeralCache, timeout behavior): https://upstash.com/docs/redis/sdks/ratelimit-ts/features
- Upstash Ratelimit GitHub repository (RateLimitConfig type, constructor options): https://github.com/upstash/ratelimit-js
- Webhook idempotency patterns (Redis SETNX, processed key TTL, duplicate handling): https://hookdeck.com/webhooks/guides/implement-webhook-idempotency
- HMAC replay prevention (timestamp validation, 5-minute window, timing-safe comparison): https://webhooks.fyi/security/replay-prevention
- Vitest mocking patterns (vi.fn, vi.mock, vi.mocked for Redis): https://vitest.dev/guide/mocking
- Redis rate limiting failover patterns (fail-open vs fail-closed decision by context): https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies
- Serverless rate limiting on Vercel with Upstash: https://vercel.com/kb/guide/add-rate-limiting-vercel
- Webhook reliability (at-least-once delivery, idempotency requirement): https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5
- Codebase analysis: `C:/Users/info/Desktop/moskee-master-template/src/lib/security.ts`
- Codebase analysis: `C:/Users/info/Desktop/moskee-master-template/src/services/webhook-service.ts`
- Codebase analysis: `C:/Users/info/Desktop/moskee-master-template/src/pages/api/donate.ts`
- Codebase analysis: `C:/Users/info/Desktop/moskee-master-template/src/pages/api/mollie-webhook.ts`
- Project context: `C:/Users/info/Desktop/moskee-master-template/.planning/PROJECT.md`
- Concerns audit: `C:/Users/info/Desktop/moskee-master-template/.planning/codebase/CONCERNS.md`

---
*Feature research for: Serverless security hardening — Redis failover + webhook idempotency*
*Researched: 2026-02-28*
