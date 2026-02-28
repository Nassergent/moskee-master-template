# Architecture Research

**Domain:** Serverless security hardening — Redis failover + webhook test coverage
**Researched:** 2026-02-28
**Confidence:** HIGH (based on direct codebase inspection of all affected files)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer (Vercel Serverless)                │
│                                                                     │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  donate.ts    │  │ mollie-webhook   │  │  contact.ts /        │  │
│  │  POST /donate │  │ POST /mollie-    │  │  vrijwilligers.ts    │  │
│  │               │  │ webhook          │  │                      │  │
│  └──────┬────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                   │                        │              │
├─────────┼───────────────────┼────────────────────────┼──────────────┤
│         ↓                   ↓                        ↓              │
│                  Security Layer (src/lib/security.ts)               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  checkRateLimit(ip)  │  checkOrigin()  │  isBot()  │ ...     │   │
│  │                                                              │   │
│  │  [TODAY: fail-open if Redis unavailable]                     │   │
│  │  [TARGET: per-route strategy: hard-fail OR in-memory LRU]    │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│                                 ↓                                   │
│              Redis Tier (Upstash REST API over HTTPS)               │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Rate limit counters (sliding window)                      │     │
│  │  Idempotency keys  (tenantId:processed:paymentId, 7d TTL)  │     │
│  │  Processing locks  (tenantId:processing:paymentId, 5m TTL) │     │
│  └────────────────────────────────────────────────────────────┘     │
│                         ↑              ↑                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              In-Memory Fallback (NEW)                       │    │
│  │  LRU Map<ip, {count, resetAt}>  — rate limiting only        │    │
│  │  NOT used for webhook idempotency (unsafe serverless)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Webhook Processing Flow                          │
│                                                                     │
│  Mollie → POST /api/mollie-webhook                                  │
│      │                                                              │
│      ├─ HMAC verification (timing-safe, mandatory in live mode)     │
│      ├─ Rate limit check (20 req/min per IP)                        │
│      └─ paymentId validation                                        │
│                          ↓                                          │
│          processWebhook(paymentId) — webhook-service.ts             │
│      ┌───────────────────────────────────────────────────────┐      │
│      │  A: Redis available? NO → 503 (Mollie retries)        │      │
│      │  B: idempotency check (EXISTS tenantId:processed:*)   │      │
│      │  C: processing lock  (SET NX tenantId:processing:*)   │      │
│      │  D: fetch payment from Mollie API                     │      │
│      │  E: Sanity patch (retryWithBackoff x3)                │      │
│      │  F: SET processed key + DEL lock (CRITICAL ORDER)     │      │
│      │  G: email dispatch (retry x3, non-blocking failure)   │      │
│      └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Boundary Rule |
|-----------|---------------|-------------------|---------------|
| `src/lib/security.ts` | Rate limiting, IP extraction, CSRF check, bot detection | Upstash Redis (rate limit), in-memory Map (fallback) | All API routes call this; it must NEVER import from services or pages |
| `src/services/webhook-service.ts` | Full idempotent webhook processing pipeline | Redis (idempotency + lock), Mollie API, Sanity writeClient, email-service | Entry point is `processWebhook(paymentId)` — no HTTP in this layer |
| `src/pages/api/mollie-webhook.ts` | HTTP boundary: HMAC verify, parse body, delegate | security.ts (rate limit), webhook-validators.ts, webhook-service.ts | Owns HTTP request/response; delegates logic entirely to service |
| `src/pages/api/donate.ts` | HTTP boundary: validate, create Mollie payment | security.ts (rate limit + CSRF), payment-validators.ts, Mollie API | Owns HTTP; no direct Redis access |
| `src/pages/api/contact.ts` / `vrijwilligers.ts` | Form submission handling | security.ts (rate limit + CSRF), Sanity, Resend | Allowed to use in-memory fallback; NOT payment-critical |
| **NEW: FailStrategy config** | Per-route decision: hard-fail vs. in-memory fallback | Consumed by `checkRateLimit()` | Configuration, not runtime logic |
| **NEW: in-memory LRU layer** | Local rate limiting when Redis unreachable | Lives inside security.ts | Isolated; must not leak state between routes in tests |
| **Test doubles (NEW)** | Controllable Redis stub for test scenarios | Consumed by webhook-service.ts tests | Injected via dependency inversion or vi.mock() |

---

## Data Flow

### Rate Limiting Flow (Current → Target)

```
API Request arrives
    │
    ▼
checkRateLimit(ip, maxReq, windowMs)
    │
    ├── Redis available?
    │       YES → Upstash sliding window → return success/fail
    │       NO  → [CURRENT] silently skip (fail-open)  ← DANGER
    │             [TARGET]  check FailStrategy for this route
    │                ├── strategy = 'hard-fail' → return false (reject, 503)
    │                └── strategy = 'in-memory' → LRU Map lookup/update
    │
    └── result: boolean (true = allow, false = reject)
```

### Webhook Idempotency Flow (Current — already correct)

```
POST /api/mollie-webhook
    │
    ├── HMAC verify
    ├── parse paymentId
    │
    ▼
processWebhook(paymentId)
    │
    ├── getRedis() → null?  → 503 immediately (correct: hard fail)
    │
    ├── r.exists(processed key)  → throws?  → 503 (Mollie retries)
    │
    ├── r.set(lock key, NX)  → throws?  → 503
    │
    ├── mollie.payments.get() → 4xx? → 200 (don't retry)
    │                         → 5xx? → 500 (Mollie retries)
    │
    ├── Sanity patch (retryWithBackoff x3)
    │
    ├── r.set(processed key)  ← CRITICAL: happens BEFORE email
    │   r.del(lock key)
    │
    └── email dispatch (retry x3, failures logged not thrown)
```

### Test Data Flow (Target — for webhook-service tests)

```
Test → inject mock Redis client (via vi.mock or factory fn)
         │
         ├── Scenario A: Redis timeout  → mock r.exists() throws
         │     Expected: processWebhook returns {status: 503}
         │
         ├── Scenario B: Redis unavailable  → mock getRedis() returns null
         │     Expected: processWebhook returns {status: 503}
         │
         ├── Scenario C: duplicate webhook  → mock r.exists() returns 1
         │     Expected: processWebhook returns {status: 200, body: 'Already processed'}
         │
         └── Scenario D: HMAC replay  → verifyHmacTimingSafe() returns false
               Expected: mollie-webhook route returns {status: 401}
               Note: this test belongs on the ROUTE layer, not the service
```

---

## Recommended Project Structure for New Code

```
src/
├── lib/
│   └── security.ts               # MODIFY: add FailStrategy + per-route config
│       ├── FailStrategy type      # 'hard-fail' | 'in-memory'
│       ├── ROUTE_FAIL_STRATEGIES  # Record<string, FailStrategy>
│       └── checkRateLimit()       # updated: consult strategy when Redis down
│
├── services/
│   └── webhook-service.ts        # NO CHANGE — already hard-fails correctly
│
└── lib/logic/
    └── lru-cache.ts              # NEW (optional): extracted LRU for testability
        └── InMemoryRateLimiter   # class or pure functions; no side effects

tests/ (or src/services/__tests__/)
├── webhook-service.test.ts       # NEW: 4 Redis failure scenarios
│   ├── redis-unavailable
│   ├── redis-timeout (exists throws)
│   ├── duplicate-webhook (exists returns 1)
│   └── (redis timeout on lock step)
│
└── mollie-webhook-route.test.ts  # NEW: HMAC replay scenario (route-level)
    └── invalid-signature → 401
```

---

## Architectural Patterns

### Pattern 1: Configurable Fail Strategy per Route

**What:** `checkRateLimit()` accepts or consults a per-route strategy enum. When Redis is unavailable, donation routes hard-fail (return false = 429/503) while contact/volunteer routes fall back to in-memory LRU.

**When to use:** Any time a security boundary has different risk profiles per endpoint.

**Trade-offs:**
- Pro: Donation payments never silently degrade. Contact form stays usable during Redis blip.
- Con: Two code paths to test. In-memory fallback is per-invocation in Vercel serverless — it provides no cross-instance protection, only within a single cold-start session.

**Example:**
```typescript
// src/lib/security.ts

export type FailStrategy = 'hard-fail' | 'in-memory';

const ROUTE_FAIL_STRATEGIES: Record<string, FailStrategy> = {
  '/api/donate':        'hard-fail',   // Money — never fail open
  '/api/contact':       'in-memory',   // Contact form — degrade gracefully
  '/api/vrijwilligers': 'in-memory',   // Volunteer form — degrade gracefully
  '/api/mollie-webhook': 'hard-fail',  // Webhook — already hard-fails in service
};

export async function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60_000,
  strategy: FailStrategy = 'hard-fail'
): Promise<boolean> {
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    return success;
  }

  // Redis unavailable
  if (strategy === 'hard-fail') {
    return false; // Force 503 — do not let request through
  }

  // in-memory fallback (development + Redis blips for non-critical routes)
  return inMemoryCheck(ip, maxRequests, windowMs);
}
```

### Pattern 2: Dependency-Injected Redis for Tests

**What:** `webhook-service.ts` currently uses module-level `getRedis()`. For testability, the Redis client must be mockable without rewriting the module. Use `vi.mock('@upstash/redis')` at the test level to intercept constructor calls, or refactor `getRedis()` to accept an optional override.

**When to use:** Any service that makes I/O calls to external systems that need failure-path testing.

**Trade-offs:**
- `vi.mock()` approach: No production code change, but mock setup is verbose.
- Factory injection: Cleaner tests, requires small production refactor to accept `redis?: Redis | null` param in `processWebhook()`.

**Example (vi.mock approach — zero prod change required):**
```typescript
// webhook-service.test.ts

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must be called before module import
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    exists: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
    set: vi.fn(),
    del: vi.fn(),
  })),
}));

// Set env vars so getRedis() initializes the mock
vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');

import { processWebhook } from '../webhook-service';

describe('processWebhook — Redis timeout on idempotency check', () => {
  it('returns 503 so Mollie retries', async () => {
    const result = await processWebhook('tr_testPaymentId');
    expect(result.status).toBe(503);
  });
});
```

### Pattern 3: Route-Level vs Service-Level Test Boundaries

**What:** Separate test responsibility by layer. The HMAC replay scenario tests the route (`mollie-webhook.ts`), not the service. The Redis failure scenarios test the service (`webhook-service.ts`), not the route. This keeps tests focused and avoids needing a full HTTP server in unit tests.

**When to use:** When a system has a clear HTTP boundary (route) and a separate logic boundary (service).

**Trade-offs:**
- Pro: Faster tests — no HTTP round-trip needed for service tests.
- Con: Route-level tests need a way to call the route handler function directly (Astro exports `POST` as an async function — it can be called directly in tests).

**Example (route-level HMAC test):**
```typescript
// mollie-webhook-route.test.ts

import { POST } from '../../pages/api/mollie-webhook';

it('returns 401 for invalid HMAC signature in live mode', async () => {
  vi.stubEnv('MOLLIE_API_KEY', 'live_xxxxxxxxxxxx');
  vi.stubEnv('MOLLIE_WEBHOOK_SECRET', 'webhook-secret');

  const request = new Request('https://test.example.com/api/mollie-webhook', {
    method: 'POST',
    body: 'id=tr_testId',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-mollie-signature': 'invalid-sig',
    },
  });

  const ctx = { request, url: new URL(request.url), params: {}, locals: {} };
  const response = await POST(ctx as any);
  expect(response.status).toBe(401);
});
```

---

## Anti-Patterns

### Anti-Pattern 1: In-Memory Fallback for Webhook Idempotency

**What people do:** Add an in-memory `Set<string>` as fallback for tracking processed payment IDs when Redis is down.

**Why it's wrong:** Vercel serverless gives each invocation a fresh memory space. Two simultaneous Mollie webhook retries for the same payment ID land on different Lambda instances. In-memory has zero shared state between invocations. Result: duplicate Sanity patches (`huidigBedragCents` incremented twice).

**Do this instead:** The existing code is correct — `webhook-service.ts` returns 503 when Redis is unavailable. Mollie's retry mechanism handles the delay. Document this explicitly so no developer "improves" it with an in-memory fallback.

### Anti-Pattern 2: Sharing the Same `ratelimit` Instance Across Routes with Different Limits

**What people do:** Initialize one `Ratelimit` instance at module level (e.g., `slidingWindow(5, '60 s')`) and use it for all routes.

**Why it's wrong:** The donation route (5/min) and webhook route (20/min) have different limits. A shared instance uses one limit for all. Current code already passes `maxRequests` to `checkRateLimit()`, but the Upstash `Ratelimit` instance is created with a hardcoded `5` limit at module init — the per-call `maxRequests` parameter is only used by the in-memory path.

**Do this instead:** Create the `Ratelimit` instance lazily inside `checkRateLimit()` with the provided `maxRequests`, OR use Upstash's `Ratelimit.multiple()` to support different limiters. For this milestone, document the mismatch — it is a moderate concern but not a security regression since 5/min is already restrictive for donations.

### Anti-Pattern 3: Testing the Full HTTP Stack for Unit-Level Concerns

**What people do:** Spin up Astro's dev server in tests, send real HTTP requests to test Redis failure paths.

**Why it's wrong:** Requires full Astro environment, Vite compilation, and port binding. Slow (10-30s per test run). Fails in CI without complex setup. Impossible to mock Redis at the network layer without a proxy.

**Do this instead:** Call the exported `POST` handler function directly in tests (Astro exports them as standard async functions). Mock Redis at the module level with `vi.mock()`. Only add HTTP-level tests (Playwright/integration) for end-to-end payment flows — not for failure-path unit coverage.

---

## Integration Points

### External Services

| Service | Integration Pattern | Failover Behavior | Notes |
|---------|---------------------|-------------------|-------|
| Upstash Redis | REST HTTP (not TCP) — `@upstash/redis` | Rate limit: per-route strategy. Idempotency: hard 503 | REST means no persistent connection; each call is an HTTPS request |
| Mollie Webhooks | Push (Mollie calls us) | 503 → Mollie retries automatically (5x over 1 hour) | Retry behavior documented in Mollie API docs |
| Mollie Payments API | Pull (we call Mollie) inside webhook handler | 4xx → don't retry. 5xx/network → return 500, let Mollie retry | |
| Sanity writeClient | REST mutations | `retryWithBackoff` x3 (100ms → 300ms → 900ms) | Already implemented |
| Resend Email | REST API | Email retry x3 with `sleep()`, failure logged not thrown | Non-blocking: payment committed before email attempt |

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| API Route → security.ts | Direct function call | Route must pass `strategy` or route identifier so `checkRateLimit` knows which policy applies |
| API Route → webhook-service.ts | Direct function call (processWebhook) | Route owns HTTP; service owns business logic. Service returns `WebhookResult` — no HTTP objects cross this boundary |
| webhook-service.ts → Redis | `@upstash/redis` client (lazy singleton via `getRedis()`) | `redisChecked` flag prevents re-init. Tests must reset module state between test suites or use `vi.resetModules()` |
| webhook-service.ts → Sanity | `writeClient` import from `sanity/lib/client.ts` | Direct import — no injection. Mock with `vi.mock('../../sanity/lib/client')` in tests |
| Tests → webhook-service.ts | `vi.mock('@upstash/redis')` + `vi.stubEnv()` | Must stub env vars BEFORE module import due to module-level `getRedis()` initialization |

---

## Build Order (Dependency Implications)

The two workstreams — Redis failover and webhook tests — have one shared dependency: the `checkRateLimit()` signature change. Build in this order to avoid rework:

```
Step 1: Define FailStrategy type + update checkRateLimit() signature
        └── Unblocks: all route updates + in-memory LRU implementation
        └── File: src/lib/security.ts

Step 2: Implement in-memory LRU correctly (bounded Map, TTL-based expiry)
        └── Depends on: Step 1 (FailStrategy type)
        └── File: src/lib/security.ts (inline) or src/lib/logic/lru-cache.ts

Step 3: Update API routes to pass strategy
        ├── donate.ts → 'hard-fail'
        ├── contact.ts → 'in-memory'
        └── vrijwilligers.ts → 'in-memory'
        └── Depends on: Step 1

Step 4: Write webhook-service unit tests (4 Redis scenarios)
        ├── Redis unavailable (getRedis returns null)
        ├── Redis timeout on idempotency check (exists throws)
        ├── Redis timeout on lock acquire (set throws)
        └── Duplicate webhook (exists returns 1)
        └── Depends on: nothing (pure test addition, no prod code change)
        └── Can run in PARALLEL with Steps 1-3

Step 5: Write mollie-webhook route test (HMAC replay)
        └── Depends on: nothing (pure test addition)
        └── Can run in PARALLEL with Steps 1-3

Step 6: Verify all tests green
        └── Depends on: Steps 1-5
```

Steps 4 and 5 are independent of Steps 1-3 and can be developed in parallel. The FailStrategy work (Steps 1-3) is the only chain with internal dependencies.

---

## Scalability Considerations

| Scale | Rate Limit Architecture |
|-------|------------------------|
| Single mosque (current) | Upstash free tier sufficient. In-memory fallback adds resilience at zero cost |
| 10-mosque fleet | Each mosque = separate Upstash database (isolated via env vars). No cross-tenant leakage. LRU fallback remains per-instance |
| 100-mosque fleet | Upstash Pro per tenant. Consider shared rate limit infrastructure only if centralized billing required |

### Scaling Priority for This Milestone

The Redis failover work addresses the most immediate scaling concern: Upstash free tier allows 100 concurrent connections. A Redis blip (not full outage) during peak donation time currently silently allows unlimited donations through. The hard-fail strategy for donation routes prevents this from becoming a DDoS vector or financial risk.

---

## Sources

- Direct codebase inspection: `src/lib/security.ts`, `src/services/webhook-service.ts`, `src/pages/api/donate.ts`, `src/pages/api/mollie-webhook.ts`, `src/lib/logic/prayer-engine.test.ts`
- `.planning/codebase/ARCHITECTURE.md` — existing layer documentation (2026-02-28)
- `.planning/codebase/CONCERNS.md` — security audit findings (2026-02-28)
- `.planning/PROJECT.md` — milestone requirements (2026-02-28)
- Confidence: HIGH — all findings derived from inspecting actual source files, not training data assumptions

---

*Architecture research for: Astro 5 serverless security hardening — Redis failover + webhook test coverage*
*Researched: 2026-02-28*
