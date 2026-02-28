# Stack Research

**Domain:** Serverless security hardening — Redis failover + webhook idempotency testing
**Researched:** 2026-02-28
**Confidence:** HIGH (core choices) / MEDIUM (version-specific features)

---

## Context: What This Research Covers

This is a **subsequent milestone** research file. The base stack (Astro 5, Upstash Redis, Mollie, Vitest) is already in production. This document covers only the **additive libraries and patterns** needed to implement:

1. Redis fail-open fallback with in-memory LRU cache (for rate limiting)
2. Configurable fail strategy per API route (hard fail vs. soft fallback)
3. Comprehensive webhook idempotency test coverage

Do not re-evaluate the existing stack. Only additions and configuration changes are in scope.

---

## Recommended Stack

### Core Technologies (existing — for context only)

| Technology | Version | Relevant Capability |
|------------|---------|---------------------|
| `@upstash/ratelimit` | `^2.0.8` | Already installed. Has built-in `timeout` (fail-open) and `ephemeralCache` (in-memory). |
| `@upstash/redis` | `^1.36.2` | Already installed. REST-based — throws on network error, caught in try/catch. |
| `vitest` | `^4.0.18` | Already installed. Supports `vi.mock`, `vi.fn`, `vi.useFakeTimers`, `vi.advanceTimersByTimeAsync`. |

### New Dependencies Needed

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `lru-cache` | `^11.2.6` | In-memory LRU cache as Redis fallback for rate limiting | Industry-standard (294M+ weekly downloads). Ships its own TypeScript types — no `@types/` needed. Named ESM export `LRUCache`. Supports `max` (item count), `ttl` (milliseconds), `maxSize` + `sizeCalculation`. Works on Vercel with correct warm-invocation semantics. |

No other new dependencies are required. The existing stack is sufficient for all three requirements.

---

### Supporting Libraries (no install needed)

| Feature | Mechanism | Notes |
|---------|-----------|-------|
| Fail-open via timeout | `@upstash/ratelimit` `timeout` option | Built into v2.x. Set `timeout: 500` (ms) — if Redis doesn't respond in 500ms, request is allowed through. Response has `reason: 'timeout'` for observability. |
| Ephemeral cache | `@upstash/ratelimit` `ephemeralCache` option | Pass a `Map<string, number>` instance. Rate limiter avoids Redis round-trip for already-blocked identifiers. NOT a fail-open replacement — supplements Redis, does not replace it. |
| In-memory LRU fallback | `lru-cache` `LRUCache` | Used when Redis is fully unavailable (null redis client). Provides best-effort rate limiting for contact/volunteers routes. NOT used for donate routes (hard fail instead). |
| Vitest module mocking | `vi.mock` factory pattern | Mock `@upstash/redis` at module level to simulate timeout, network error, and unavailable scenarios. |
| Vitest timer control | `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()` | Test Redis timeout scenarios without real network calls or real waits. Use async variant to avoid promise/timer deadlocks. |

---

## Installation

```bash
# One new production dependency
npm install lru-cache

# No new dev dependencies — vitest already covers test needs
```

---

## Configurable Fail Strategy: Architecture Decision

The project requires **per-route fail strategy**. This is not a library choice — it is a code pattern. Research confirms the correct model:

### Hard Fail (donate route)

```typescript
// src/lib/security.ts — donate.ts behavior
if (!ratelimit && !inMemoryFallback) {
  return new Response('Service Unavailable', { status: 503 });
}
```

**Rationale:** Payment routes must never accept unmetered traffic. If rate limiting infrastructure is down, rejecting with 503 is correct. The user can retry. A DDoS via failed Redis is a worse outcome than a temporary service interruption.

**Confidence:** HIGH — confirmed by OWASP API Top 10, payment security best practices (APIsec 2025), and the VW incident analysis from web research.

### Fail-Open with LRU Fallback (contact, volunteers routes)

```typescript
// src/lib/security.ts — contact/volunteers behavior
if (!ratelimit) {
  // Use in-memory LRU — best-effort limiting, no hard block
  return inMemoryCheck(ip, maxRequests, windowMs);
}
```

**Rationale:** Form submission routes have lower abuse impact. In-memory LRU provides meaningful rate limiting even without Redis (blocks same-IP bursts within a single warm invocation). The risk of a contact form flood is acceptable vs. the risk of rejecting legitimate mosque visitors.

**Confidence:** MEDIUM — pattern derived from Vercel warm-invocation behavior (confirmed: state persists when function is warm, Vercel claims <1% cold starts in 2025). Caveat: across different concurrent invocations, in-memory state is NOT shared.

---

## Webhook Idempotency Testing: Tools and Patterns

### Test Tool Choice: Vitest Only (no additional libraries)

**Rationale:** `webhook-service.ts` is pure TypeScript with injected dependencies. All four test scenarios can be covered with `vi.mock` + `vi.fn().mockRejectedValueOnce()` patterns. No integration test harness is needed for this milestone.

### The Four Required Test Scenarios

| Scenario | Mechanism | Vitest Pattern |
|----------|-----------|----------------|
| Redis timeout during idempotency check | `r.exists()` throws after delay | `vi.fn().mockRejectedValueOnce(new Error('timeout'))` |
| Redis fully unavailable | `getRedis()` returns `null` | Mock env vars so `UPSTASH_REDIS_REST_URL` is undefined |
| Duplicate webhook (same payment twice) | `r.exists()` returns `1` on second call | `vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1)` |
| HMAC replay attack (expired/reused signature) | Timestamp outside 300s window | Pure logic test in `webhook-validators.ts` — no Redis needed |

### HMAC Replay Attack Testing

The current codebase validates HMAC signatures but there is no documented timestamp window check. Research confirms the industry standard is **300 seconds (5 minutes)**. The test should:
1. Confirm a valid HMAC with current timestamp passes
2. Confirm a valid HMAC with timestamp > 300s ago fails

This is a pure unit test with no mocking — test the validator function directly.

**Confidence:** HIGH — 300s window is confirmed across Stripe, webhook best practice docs, and HMAC security references.

---

## Vercel Serverless: In-Memory Cache Behavior

**Critical finding for LRU cache design:**

Vercel serverless functions CAN retain in-memory state between requests **when the function is warm** (same physical instance reused). Vercel reports 99.37% of requests avoid cold starts (2025 data). Bytecode caching is now default for Node.js 20+.

However:
- **Cold starts = fresh memory** — LRU cache is empty, first request has no rate limit history
- **Concurrent invocations = separate memory** — Two simultaneous requests may hit different instances with independent LRU state

**Implication for design:** In-memory LRU fallback provides **per-instance** rate limiting. It is correct to use it as a soft fallback (contact/volunteers), not as a hard guarantee. For donate routes, hard fail remains correct.

**Confidence:** MEDIUM — Vercel's official documentation confirms warm-invocation state persistence, but specific instance reuse guarantees are not documented precisely. The 99.37% claim is from Vercel's own blog (2025).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `lru-cache@11` | `node-cache` | Older API, no ESM-first design, less actively maintained. lru-cache has 60x more downloads and ships own TS types. |
| `lru-cache@11` | Custom `Map`-based cache (existing) | Existing `rateLimitMap` in `security.ts` is already a manual LRU approximation — but has no eviction, no TTL enforcement, and grows unbounded. Replacing with `lru-cache` fixes these gaps with one dependency. |
| `vi.mock` factory | `ioredis-mock` | ioredis-mock is for ioredis, not `@upstash/redis`. The Upstash client is HTTP-based — mocking at the module level is simpler and more direct. Known issue: ioredis-mock doesn't trigger events on ready. |
| `vi.mock` factory | `msw` (Mock Service Worker) | Overkill for unit tests. MSW intercepts at the HTTP layer; `vi.mock` intercepts at the module level — simpler for pure logic testing. MSW belongs in integration/E2E tests. |
| Vitest `advanceTimersByTimeAsync` | `advanceTimersByTime` (sync) | Sync variant causes promise/timer deadlocks when async operations are interleaved with timers. The async variant (`advanceTimersByTimeAsync`) was added specifically to fix this. Use it. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `quick-lru` | ESM-only, no TTL support, smaller feature set | `lru-cache@11` |
| `@types/lru-cache` | Deprecated — lru-cache v7+ ships its own types | Nothing — types are bundled |
| `ioredis-mock` | Wrong client. Only works with `ioredis`, not `@upstash/redis` | `vi.mock('@upstash/redis', ...)` factory |
| `supertest` for webhook tests | Requires HTTP server boot, wrong for pure unit tests | Direct function calls to `processWebhook()` in Vitest |
| Upstash `ephemeralCache` alone as fail-open | Does NOT work when Redis is unreachable — ephemeralCache only avoids round-trips for already-blocked identifiers, not for uninitialized Redis | `lru-cache` + manual fallback logic |
| `vi.advanceTimersByTime` (sync) | Deadlocks when promises are chained with timers | `vi.advanceTimersByTimeAsync` |

---

## Stack Patterns by Variant

**If Redis is available (production — normal path):**
- Use `@upstash/ratelimit` with `timeout: 500` option
- `timeout` acts as automatic fail-open for transient Redis latency spikes
- For donate: also set hard fail if `ratelimit` itself failed to initialize

**If Redis is unavailable (no env vars — local dev, or Redis credentials rotated):**
- For donate route: return 503 immediately
- For contact/volunteers: fall through to `LRUCache`-backed in-memory limiter
- Log the degraded state via `src/lib/logic/logger.ts` (structured, not `console.error`)

**If testing webhook idempotency:**
- Mock `@upstash/redis` at the module boundary
- Control `r.exists()`, `r.set()`, `r.del()` individually per test
- Use `beforeEach` to reset mocks with `vi.resetAllMocks()`
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for timeout simulation
- Restore real timers in `afterEach`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `lru-cache@11.2.6` | Node.js 16.14.0+ (Node 22 confirmed OK) | ESM named export only: `import { LRUCache } from 'lru-cache'`. No CommonJS. Package type = `module` in project — compatible. |
| `vitest@4.0.18` | `vi.advanceTimersByTimeAsync` | Available since Vitest 1.6. Confirmed in v4.x. |
| `@upstash/ratelimit@2.0.8` | `timeout` option | Present in v2.x. Default is 5000ms if not set — set explicitly to 500ms for Vercel latency budget. |
| `@upstash/ratelimit@2.0.8` | `ephemeralCache` | Accepts `Map<string, number>`. NOT a Redis fallback — only reduces Redis calls for already-blocked IPs. |

---

## Sources

- [lru-cache@11.2.6 jsDocs.io](https://www.jsdocs.io/package/lru-cache) — Verified version 11.2.6, ESM, bundled types
- [isaacs/node-lru-cache GitHub](https://github.com/isaacs/node-lru-cache) — Canonical source, MEDIUM confidence (latest commit not checked)
- [Upstash Ratelimit Features — timeout option](https://upstash.com/docs/redis/sdks/ratelimit-ts/features) — `timeout` parameter confirmation, MEDIUM confidence (official docs)
- [Upstash Ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) — v2.0.8 confirmed installed
- [Vitest Mocking Timers](https://vitest.dev/guide/mocking/timers) — `advanceTimersByTimeAsync` pattern, HIGH confidence (official docs)
- [Vitest Module Mocking](https://vitest.dev/guide/mocking/modules) — `vi.mock` factory pattern, HIGH confidence (official docs)
- [Vercel: Scale to One / Fluid Compute blog](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts) — Warm invocation state retention, MEDIUM confidence (vendor blog)
- [webhooks.fyi — Replay Prevention](https://webhooks.fyi/security/replay-prevention) — 300s timestamp window standard, MEDIUM confidence (community docs)
- [Gravitee — Rate Limiting Fail Strategies](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies) — Fail-open vs fail-closed pattern, MEDIUM confidence (vendor blog)
- [OWASP API Top 10 / APIsec 2025](https://www.apisec.ai/blog/api-security-testing-payment-systems) — Hard fail for payment rate limits, HIGH confidence (security standard)

---

*Stack research for: Redis failover + webhook idempotency testing (security hardening milestone)*
*Researched: 2026-02-28*
