# Pitfalls Research

**Domain:** Serverless security hardening — Redis failover + webhook idempotency testing
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (verified against official Upstash docs, Mollie community sources, Vitest docs, and current production codebase)

---

## Critical Pitfalls

### Pitfall 1: In-Memory Fallback Treats All Serverless Invocations as One Process

**What goes wrong:**
A `Map`-based in-memory rate limit fallback is initialized at module scope in `src/lib/security.ts`. On Vercel serverless, each function invocation gets a fresh V8 isolate after a cold start. The fallback map appears to work in local development (single long-lived process) but resets to zero on every cold start in production. Two concurrent requests in separate invocations see completely independent maps — neither knows the other allowed a request. A burst of 50 requests spread across 10 cold invocations bypasses the in-memory limit entirely.

**Why it happens:**
The pattern looks correct in any persistent-process runtime (Node.js server, Express, Fastify). Developers test locally where the process is warm and long-lived. The mistake is invisible until load testing in a real serverless environment.

**How to avoid:**
- The in-memory `Map` fallback is only acceptable for **local development** — document this explicitly in code comments.
- For production serverless, the only valid fallback strategies are:
  a. **Hard fail (503)**: Return 503 immediately if Redis is unreachable — correct for donation and payment routes.
  b. **Warm-instance-only cache**: Use Upstash's `ephemeralCache` option (`new Map()` passed to `Ratelimit` constructor), which is honest about its scope — it only dedups requests within a single hot invocation context and never claims cross-invocation coverage.
- The configurable fail-strategy must be set **per route at construction time**, not at call time, to avoid conditional logic that can be bypassed.

**Warning signs:**
- Load test shows rate limiting stops working above a threshold of concurrent requests.
- Local tests pass, production bursts get through.
- The `rateLimitMap` in `security.ts` has keys that never exceed 1–2 entries in production logs.

**Phase to address:**
Phase implementing `in-memory LRU fallback + configurable fail-strategy` — must establish the correct mental model before writing any code: in-memory = dev-only, Redis = production, 503 = hardened production fallback for critical routes.

---

### Pitfall 2: Single Ratelimit Instance — Wrong Config Shared Across Routes

**What goes wrong:**
The current `security.ts` creates a single `Ratelimit` instance with `slidingWindow(5, '60 s')` used by all routes via `checkRateLimit()`. If a configurable per-route strategy is added by passing `maxRequests` / `windowMs` parameters to `checkRateLimit()`, the function still calls the shared Upstash `ratelimit.limit(ip)` — which uses the **constructor-time** window, not the call-time parameters. The `maxRequests` and `windowMs` arguments silently have no effect in the Redis path. Only the in-memory fallback path respects them.

**Why it happens:**
`@upstash/ratelimit` bakes the algorithm and window into the `Ratelimit` instance. You cannot change the window per call — you need a separate instance per policy. Developers often assume the rate limit parameters flow through to Redis because they do in the fallback path.

**How to avoid:**
- Create **separate named `Ratelimit` instances** per route policy, e.g.:
  ```typescript
  export const donationLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s') });
  export const contactLimiter  = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') });
  ```
- Route files import the specific limiter, not a generic `checkRateLimit(ip, n, ms)` that silently ignores `n` and `ms` in production.
- Add a test that asserts the donation limiter rejects on the 6th request and the contact limiter does not.

**Warning signs:**
- `checkRateLimit(ip, 20, 60_000)` called for contact route but donation rate (5/min) triggers 429 on the contact form.
- Changing `maxRequests` in a call site has no observable effect in staging.

**Phase to address:**
Phase implementing configurable fail-strategy per route — the per-instance architecture decision must be made here, not retrofitted later.

---

### Pitfall 3: Redis Timeout Is Not the Same as Redis Unavailable — Tests Miss the Difference

**What goes wrong:**
Webhook idempotency tests mock Redis as either "works perfectly" or "throws immediately". In production, the most dangerous failure mode is a **timeout** — `r.exists()` hangs for several seconds then rejects. On Vercel, serverless functions have a default timeout (10s on Hobby, 60s on Pro). A Redis call that hangs for 8 seconds before rejecting means the webhook handler occupies the slot for 8 seconds, Mollie's retry fires, a second invocation starts, Redis is still hung, and both proceed to process the payment simultaneously. The lock-acquire step in `webhook-service.ts` is also blocked, so the race window is real.

**Why it happens:**
`vi.mock('@upstash/redis', ...)` that throws synchronously does not simulate a network timeout. It simulates a hard crash. Developers write one unhappy-path mock and consider Redis failure covered.

**How to avoid:**
- Add a slow-reject mock using `vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)))` — but with a `vi.useFakeTimers()` to fast-forward without actually waiting.
- Test that the handler returns 503 **before** the Vercel function timeout, and that the lock is not left orphaned.
- In production code, wrap every Redis call with `Promise.race([redisCall, timeout(3000)])` — explicit per-call timeout, not relying on the Upstash client default.

**Warning signs:**
- Tests only have two Redis mock states: `resolves(value)` and `rejects(new Error())`.
- No `vi.useFakeTimers()` in the webhook test file.
- Webhook handler has no explicit per-call Redis timeout.

**Phase to address:**
Phase implementing webhook idempotency test coverage — the timeout simulation must be a first-class test case, not an afterthought.

---

### Pitfall 4: Webhook 503 Does Not Guarantee Mollie Will Retry

**What goes wrong:**
The `webhook-service.ts` returns 503 when Redis is unavailable, with the assumption that "Mollie will retry automatically." Mollie does retry webhooks on non-2xx responses — but the retry schedule is not guaranteed to be within a safe window, and the maximum retry count is finite (Mollie retries up to ~24 hours per the community docs, but the intervals are exponential and unpredictable). If Redis is down for longer than Mollie's retry window, or if the Vercel function times out before returning 503 (see Pitfall 3), Mollie abandons the webhook and the payment is never finalized in Sanity.

**Why it happens:**
The 503 pattern is correct and is the right choice for idempotency safety. The pitfall is treating it as sufficient — no monitoring, no dead-letter queue, no reconciliation path. The team relies entirely on Mollie's retry as the recovery mechanism.

**How to avoid:**
- Document explicitly that 503 is a "please retry" signal, not a "safe to drop" signal.
- Add a structured log entry at the `redis_required` and `idempotency_check` error steps that is queryable in Vercel logs — so ops can detect "Redis was down, N payments may need reconciliation."
- Consider a Mollie payment status poll on startup (or a daily reconcile job) to catch any payments that slipped through Mollie's retry window.
- In tests, assert that the 503 response body is exactly `'Service temporarily unavailable'` (Mollie parses the body for developer clarity, not for logic, but consistency matters).

**Warning signs:**
- No structured log on the 503 path that includes `paymentId` and `tenantId`.
- No runbook entry for "Redis was down for X hours — what payments need manual reconciliation?"
- Tests assert the 503 status code but do not assert that the lock is released before returning.

**Phase to address:**
Phase implementing Redis fail-open fallback — the 503 strategy decision must include the recovery/monitoring path, not just the status code.

---

### Pitfall 5: HMAC Replay Test Uses a Fixed Valid Signature — Misses Clock Drift

**What goes wrong:**
Webhook HMAC replay attack tests are written with a hardcoded valid signature and a hardcoded timestamp. The test verifies that replaying the same signature is rejected. But if the implementation does not check a timestamp/nonce component, the test passes on a technically incomplete guard — an attacker who captures a valid webhook body can replay it hours later and it passes the HMAC check (HMAC is deterministic for the same body and key). Mollie's own webhook docs note that the webhook body is not timestamped by default; replay protection must be layered on top.

**Why it happens:**
Developers conflate "valid signature" with "replay-safe." HMAC validates that the payload came from Mollie; it does not validate _when_ it came. The test passes because the signature is wrong on the second call — but only if the body has changed. If the test sends the exact same body twice, the HMAC is still valid on the second call unless a nonce/expiry is enforced.

**How to avoid:**
- Check whether `src/pages/api/mollie-webhook.ts` enforces a timestamp or nonce beyond the Redis idempotency key. If it only uses the idempotency key, document this as the replay defense (which is correct — Redis processed-key with 7-day TTL is replay protection) and write the test accordingly.
- The replay test scenario should: (1) call `processWebhook(paymentId)`, assert 200 + `'OK'`; (2) call `processWebhook(paymentId)` again with same signature, assert 200 + `'Already processed'` (from the Redis idempotency check). This tests the actual replay defense — not a fictional timestamp check.
- Do not add a timestamp check to the HMAC validation unless Mollie begins including one, as this would cause false rejections on slow networks.

**Warning signs:**
- Test description says "HMAC replay attack" but the test only checks that a tampered signature is rejected (that is a forgery test, not a replay test).
- Test mocks Redis as always returning `exists: 0` — which means the idempotency check is never actually tested as the replay defense.

**Phase to address:**
Phase implementing webhook idempotency test coverage — test scenario naming must match what is actually being tested.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single shared `Ratelimit` instance for all routes | Simple `checkRateLimit(ip)` call site | Configurable-per-route becomes a lie — only the fallback path respects the parameters | Never — create named instances from the start |
| In-memory `Map` fallback active in production | No 503 for contact/volunteer routes when Redis is down | Silent rate limit bypass under concurrent load across invocations | Dev/local only — must be gated by `import.meta.env.DEV` or removed from production path |
| Synchronous Redis error mock in tests | Fast test writing | Masks timeout-as-race-condition failure mode | Never for the idempotency lock test — must include a slow-reject mock |
| `redisChecked` module-scope flag in webhook-service | Avoids re-initializing Redis client per call | On Vercel, the module may be re-evaluated on cold start anyway — the flag provides no real caching guarantee | Acceptable for connection reuse within a warm invocation, not as a cross-invocation optimization |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@upstash/redis` in Vitest | `vi.mock('@upstash/redis')` at file level auto-mocks the entire module; `Redis` constructor becomes a no-op returning `undefined`, not a mock object | Use `vi.mock('@upstash/redis', () => ({ Redis: vi.fn().mockImplementation(() => mockRedisObject) }))` with explicit `mockRedisObject` |
| `@upstash/ratelimit` constructor | Passing `new Map()` as `ephemeralCache` looks identical in test and prod — but in test the Map persists across calls (same process), in prod each cold start gets a fresh Map | Gate the `ephemeralCache` option with `process.env.NODE_ENV !== 'production'` or accept that it is a warm-only optimization |
| Mollie `payments.get(paymentId)` in test | Using a real Mollie test key in unit tests makes tests slow and non-deterministic | Mock `@mollie/api-client` at the module level; return a fixed `{ status: 'paid', amount: { value: '25.00', currency: 'EUR' }, metadata: {...} }` object |
| Upstash `r.set(key, val, { nx: true })` | In `@upstash/redis`, `set` with `nx: true` returns `'OK'` (truthy) on success and `null` on key-already-exists. Test mocks often return `true`/`false`, causing lock logic to invert | Mock return value as `'OK'` (acquired) or `null` (already locked), matching the actual SDK contract |
| Vitest `vi.mock` hoisting | `vi.mock` is hoisted above imports, so variables defined before the mock call are `undefined` inside the factory | Use `vi.hoisted(() => { const mock = ...; return mock; })` and reference the hoisted variable inside the `vi.mock` factory |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Redis connection per cold start | Each webhook invocation opens a new HTTP connection to Upstash REST API; no connection pooling possible in serverless | Use Upstash REST API (already in use — correct choice); not TCP Redis which requires persistent connections | Every cold start, but Upstash REST has low connection overhead so impact is low |
| `retryWithBackoff` in webhook handler blocks the invocation slot | 3 Sanity retries × 900ms max backoff = up to 2.1 seconds added to webhook processing time; blocks the Vercel slot | Keep retry count at 3 and backoffs tight (100/300/900ms is correct); do not add more retries | When Sanity is slow — pushes total webhook time toward Vercel's function timeout |
| In-memory `rateLimitMap` grows unbounded | Map entries are never evicted; in a long-lived warm invocation (Fluid Compute), map grows until OOM or function restart | Add a size cap or use a simple LRU with max 1000 entries; or remove the map entirely and rely on 503 for production | On Vercel Fluid Compute (long-lived instances), after sustained traffic — rare but possible |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Returning Redis error details in 503 body | Upstash error messages can include internal Redis keys or connection strings | Always return generic `'Service temporarily unavailable'` — never pass `redisErr.message` to the HTTP response body (current code is correct; protect this in tests) |
| Lock key uses predictable prefix only | `${tenantId}:processing:${paymentId}` — if tenantId is guessable (e.g. a Sanity project ID visible in public JS), a malicious actor cannot forge the lock but can reason about processing state | Accept: paymentId is Mollie-generated UUIDv4, not guessable; lock is not a security boundary, only a concurrency boundary |
| In-memory fallback bypasses per-tenant rate limit isolation | If fallback `rateLimitMap` is keyed only by IP, a single mosque's traffic can affect rate limit state for another mosque's requests (fleet context) | Key fallback map as `${tenantId}:${ip}` not just `ip`; or remove fallback from production entirely |
| Test with real `UPSTASH_REDIS_REST_TOKEN` in `.env.test` | Accidentally writing test idempotency keys to production Redis | Use a dedicated Upstash test database; gate test env with a different token prefix; never share production Redis credentials with the test suite |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Donation route returns 503 during Redis outage with no user-facing message | Donor sees a generic error, retries, may submit twice thinking the first failed | Frontend must distinguish 503 (service down) from 429 (rate limited) and show "We're experiencing technical difficulties — your payment has not been processed" |
| Contact/volunteer form silently falls back to in-memory limiting | Spammer gets through during Redis outage; mosque admin gets flooded | Log the fallback activation clearly; consider accepting the risk for low-value forms but document the decision |
| 429 response body is in Dutch but logged in English | Inconsistency confuses developers reading logs | Keep user-facing strings in Dutch, log entries in English — current code does this correctly; protect it |

---

## "Looks Done But Isn't" Checklist

- [ ] **Redis failover:** In-memory fallback compiles and tests pass — verify it is gated `DEV only` and the donation route hard-fails in production when Redis is down.
- [ ] **Per-route fail strategy:** `checkRateLimit(ip, 20, ms)` call accepts new parameters — verify it creates a separate Upstash `Ratelimit` instance per policy, not just routing the parameters to the fallback path.
- [ ] **Webhook Redis timeout test:** Test file has a Redis "unavailable" mock — verify it also has a Redis "slow/timeout" mock using `vi.useFakeTimers()` or `setTimeout`-based rejection.
- [ ] **Replay attack test:** Test is labeled "replay attack" — verify the second call reaches the `exists` check and returns `'Already processed'`, not that it simply rejects a bad HMAC signature.
- [ ] **Duplicate webhook test:** Two calls with the same `paymentId` both return 200 — verify the second call's Sanity patch is NOT called (mock assertion on `writeClient.patch`).
- [ ] **Lock release on 503:** Handler returns 503 when Redis is down — verify the lock key is NOT written before the 503 return (it cannot be, since Redis is down, but test should assert `r.set` was never called with the lock key).
- [ ] **Upstash mock contract:** `r.set(key, val, { nx: true })` returns `'OK'` not `true` in mock — verify lock-acquired branch is exercised, not always the already-locked branch.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| In-memory fallback active in production (rate limit bypass discovered) | LOW | Deploy fix gating fallback to dev; monitor Vercel logs for burst patterns; no data loss |
| Wrong Ratelimit instance shared across routes (misconfiguration) | LOW | Create named instances; redeploy; no state to migrate |
| Webhook timeout race caused double Sanity increment | HIGH | Query Sanity for projects with `huidigBedragCents` out of sync with Mollie payment totals; manual patch; add per-call Redis timeout to prevent recurrence |
| Test suite mocking wrong return value for `r.set` NX (tests always pass on wrong branch) | MEDIUM | Fix mock contract; re-run tests; audit which test scenarios were actually covering lock-acquired vs lock-exists paths |
| Redis down for > Mollie retry window (payment lost) | HIGH | Pull Mollie payment list for the downtime window; cross-reference with Sanity `processed` keys once Redis restored; manually trigger Sanity patch for unprocessed paid payments |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| In-memory fallback active in production | Phase: Redis fail-open fallback implementation | Confirm `rateLimitMap` fallback is guarded by `!import.meta.env.PROD` or removed; load test with 10 concurrent requests to donation route while Redis is mocked down — assert all return 503 |
| Single Ratelimit instance ignores per-route config | Phase: Configurable fail-strategy per route | Unit test: donation limiter rejects on 6th request; contact limiter allows 20 requests before rejecting; both use Redis path |
| Redis timeout vs Redis unavailable not distinguished in tests | Phase: Webhook idempotency test coverage | Test suite includes at least one test using `setTimeout`-based reject (slow Redis); asserts 503 returned before 5s; `vi.useFakeTimers()` used |
| Webhook 503 has no structured recovery log | Phase: Redis fail-open fallback implementation | Structured log entry with `paymentId` and `tenantId` on every 503 path verified in test by asserting `logs` array content |
| HMAC replay test covers forgery not replay | Phase: Webhook idempotency test coverage | Test labeled "replay" calls `processWebhook` twice with same paymentId; second call asserts `'Already processed'` body and zero Sanity patch calls |
| Upstash `r.set` NX mock returns wrong type | Phase: Webhook idempotency test coverage | Review all `vi.fn().mockResolvedValue(...)` for Redis set calls — return value must be `'OK'` or `null`, not `true`/`false` |
| In-memory map not keyed by tenantId (fleet isolation) | Phase: Redis fail-open fallback implementation | Fallback map keys checked in code review; or fallback removed entirely from production path |

---

## Sources

- Upstash ratelimit-js GitHub, ephemeralCache documentation: https://github.com/upstash/ratelimit-js — MEDIUM confidence (official repo)
- Upstash ratelimit features docs (ephemeralCache per-invocation isolation): https://upstash.com/docs/redis/sdks/ratelimit-ts/features — MEDIUM confidence (official docs)
- Vercel serverless in-memory isolation (stateless per invocation): https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel — HIGH confidence (official Vercel KB)
- Upstash ratelimit NPM package (ephemeralCache option): https://www.npmjs.com/package/@upstash/ratelimit — MEDIUM confidence
- Mollie webhook retry behavior (community-sourced; official docs unavailable via fetch): https://github.com/mollie/mollie-api-php/blob/master/docs/recipes/payments/handle-webhook.md — LOW confidence (inferred from community issues)
- Vitest module mocking (vi.mock hoisting, vi.hoisted): https://vitest.dev/guide/mocking/modules — HIGH confidence (official Vitest docs)
- Fail-open vs fail-closed rate limiting tradeoffs: https://knowledgelib.io/software/system-design/rate-limiter/2026 — MEDIUM confidence (multiple sources agree)
- Codebase analysis: `src/lib/security.ts`, `src/services/webhook-service.ts`, `src/pages/api/donate.ts`, `.planning/codebase/CONCERNS.md` — HIGH confidence (primary source)

---

*Pitfalls research for: Serverless security hardening — Redis failover + webhook idempotency on Vercel (moskee-master-template)*
*Researched: 2026-02-28*
