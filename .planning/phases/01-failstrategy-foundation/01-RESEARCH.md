# Phase 1: FailStrategy Foundation - Research

**Researched:** 2026-02-28
**Domain:** @upstash/ratelimit fail-strategy typing, Redis timeout detection, TypeScript discriminated union patterns
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RATE-01 | `checkRateLimit()` accepts a `failStrategy` parameter (`hard-fail` \| `in-memory-fallback`) that determines behavior when Redis is unreachable | TypeScript discriminated union, required parameter signature |
| RATE-02 | `/api/donate` route uses `hard-fail` strategy — returns HTTP 503 when rate limiting is inoperative | `reason === "timeout"` detection from `limit()` response; try/catch for Redis error |
| RATE-03 | `/api/contact` and `/api/vrijwilligers` routes use `in-memory-fallback` strategy | Fall-through to existing in-memory Map path when Redis errors |
| RATE-05 | `@upstash/ratelimit` instance constructed with `timeout: 500` to bound Redis latency | Official Upstash docs confirm `timeout` is milliseconds, defaults to 5000ms |
</phase_requirements>

---

## Summary

Phase 1 is a surgical modification of `src/lib/security.ts` and its three callers (`/api/donate`, `/api/contact`, `/api/vrijwilligers`). The core change is adding a required `failStrategy: 'hard-fail' | 'in-memory-fallback'` parameter to `checkRateLimit()` — the TypeScript type system enforces correct usage at call sites, generating a compile error for any caller that omits it.

The key technical insight is how `@upstash/ratelimit` signals Redis unavailability. When the Redis call does not resolve within the configured `timeout` window, the library's `limit()` method returns `{ success: true, reason: "timeout" }` — it allows the request by default (fail-open by design). For the donate route, the hard-fail strategy must intercept this: if `reason === "timeout"`, the function should signal failure (not success) so the caller can return HTTP 503. Additionally, Redis can throw entirely (connection refused) — the `checkRateLimit` wrapper must catch that exception too, and apply the same fail-strategy logic. The `timeout: 500` cap ensures a Redis latency spike does not hold a Vercel serverless invocation open for the default 5000ms.

The non-financial routes (`contact`, `vrijwilligers`) use `in-memory-fallback` — the existing `rateLimitMap` code path. When Redis is unavailable (either timeout or thrown error), `checkRateLimit` falls through to the in-memory logic transparently, preserving the current behavior for these routes. No changes to the in-memory logic itself are required in Phase 1 (the unbounded Map replacement is Phase 2, RATE-04).

**Primary recommendation:** Add `failStrategy` as a required second parameter (after `ip`), use `reason === "timeout"` plus try/catch to detect Redis unavailability, return a typed result object `{ allowed: boolean; source: 'redis' | 'memory' | 'hard-fail' }` — callers check `allowed` and route handlers apply the appropriate HTTP response.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/ratelimit` | ^2.0.8 (already installed) | Sliding window rate limiting via Redis | Already in use; `timeout` and `reason` fields are v2 features |
| `@upstash/redis` | ^1.36.2 (already installed) | Redis client for Upstash | Already in use |
| TypeScript | (via Astro) | Compile-time enforcement of `failStrategy` | Type error when callers omit the parameter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.0.18 (already installed) | Unit tests | Phase 1 is purely logic changes — test only in Phase 3 scope |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `reason === "timeout"` detection | Wrapping `limit()` in a `Promise.race` with `AbortController` | Over-engineering; `timeout` option + `reason` field is the library's intended mechanism |
| Required parameter | Optional with default | Would not produce a compile error for omissions — defeats the RATE-01 goal |

**Installation:**
```bash
# No new dependencies needed — @upstash/ratelimit and @upstash/redis already present
```

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Modifications are in:
```
src/
├── lib/
│   └── security.ts          # checkRateLimit() signature + logic change
└── pages/api/
    ├── donate.ts             # Pass failStrategy: 'hard-fail'
    ├── contact.ts            # Pass failStrategy: 'in-memory-fallback'
    └── vrijwilligers.ts      # Pass failStrategy: 'in-memory-fallback'
```

### Pattern 1: Required `failStrategy` Parameter with Typed Return

**What:** Add `failStrategy` as a required second parameter. Change the return type from `Promise<boolean>` to `Promise<RateLimitResult>` so callers can inspect both `allowed` and `source`.
**When to use:** Always — the parameter is required, no default.

```typescript
// Source: Project pattern — enforces RATE-01
export type FailStrategy = 'hard-fail' | 'in-memory-fallback';

export interface RateLimitResult {
  allowed: boolean;
  source: 'redis' | 'memory' | 'hard-fail';
}

export async function checkRateLimit(
  ip: string,
  failStrategy: FailStrategy,
  maxRequests: number = 5,
  windowMs: number = 60_000
): Promise<RateLimitResult> { ... }
```

Any caller omitting `failStrategy` receives a TypeScript error at compile time — this satisfies RATE-01 success criterion 1.

### Pattern 2: Redis Unavailability Detection

**What:** The `@upstash/ratelimit` `limit()` method signals timeout via `reason === "timeout"` in its response. Redis can also throw entirely (connection refused). Both cases must be handled.

```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/methods
// reason === "timeout" means: Redis did not respond within timeout window,
// library allowed the request by default (fail-open). We override this per strategy.

if (ratelimit) {
  let response: Awaited<ReturnType<typeof ratelimit.limit>>;
  try {
    response = await ratelimit.limit(ip);
  } catch {
    // Redis connection refused / network error — apply fail strategy
    if (failStrategy === 'hard-fail') {
      return { allowed: false, source: 'hard-fail' };
    }
    // in-memory-fallback: fall through to in-memory path below
    return checkInMemory(ip, maxRequests, windowMs);
  }

  const redisUnavailable = response.reason === 'timeout';

  if (redisUnavailable) {
    if (failStrategy === 'hard-fail') {
      return { allowed: false, source: 'hard-fail' };
    }
    // in-memory-fallback: fall through to in-memory path
    return checkInMemory(ip, maxRequests, windowMs);
  }

  return { allowed: response.success, source: 'redis' };
}

// No Redis configured — in-memory only (local dev)
return checkInMemory(ip, maxRequests, windowMs);
```

### Pattern 3: Ratelimit Constructor with `timeout: 500`

**What:** Set `timeout: 500` on the Ratelimit instance so Redis latency spikes are capped at 500ms.

```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/features
// Default timeout is 5000ms — must override to 500ms per RATE-05
ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: false,
  timeout: 500,  // ms — caps Redis latency per RATE-05
});
```

### Pattern 4: Caller Update for Hard-Fail Route

**What:** `/api/donate` passes `'hard-fail'` and handles `allowed: false` + `source: 'hard-fail'` distinctly from rate-limited (429).

```typescript
// src/pages/api/donate.ts
const ip = getClientIp(request);
const rl = await checkRateLimit(ip, 'hard-fail', 5, 60_000);

if (!rl.allowed && rl.source === 'hard-fail') {
  return new Response(JSON.stringify({ error: 'Betalingsservice tijdelijk niet beschikbaar.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

if (!rl.allowed) {
  return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het over een minuut opnieuw.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 5: Caller Update for In-Memory-Fallback Routes

**What:** `/api/contact` and `/api/vrijwilligers` pass `'in-memory-fallback'` and only handle `allowed: false` (same as before — no 503 possible).

```typescript
// src/pages/api/contact.ts and src/pages/api/vrijwilligers.ts
const ip = getClientIp(request);
const rl = await checkRateLimit(ip, 'in-memory-fallback', 3, 60_000);

if (!rl.allowed) {
  return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het over een minuut opnieuw.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Anti-Patterns to Avoid

- **Optional failStrategy with default:** Adding `failStrategy: FailStrategy = 'in-memory-fallback'` as a default defeats RATE-01 — callers that omit it silently get fallback behavior on donate. Must be required.
- **Checking only `!response.success`:** When Redis times out, `response.success` is `true` (library allows by default). Checking only `!success` would miss the timeout case entirely on the donate path.
- **Returning `boolean` from `checkRateLimit`:** Callers need to know the source to differentiate 429 (rate limited) from 503 (Redis down). A typed result object is required.
- **Constructing a new Ratelimit per request:** The current singleton pattern (module-level `ratelimit` variable) is correct for Vercel serverless — each cold start constructs once. Do not move construction into the function body.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis timeout bounding | Custom `Promise.race` with `setTimeout` | `timeout: 500` on Ratelimit constructor | Library implements this correctly with proper cleanup; custom race leaves dangling promises |
| Redis availability detection | Ping Redis before each call | `reason === "timeout"` + try/catch | Ping doubles latency; reason field is the designed mechanism |
| In-memory rate limiting | New custom logic | Existing `rateLimitMap` code already in `security.ts` | Already works; Phase 1 only routes to it, Phase 2 replaces the Map itself |

**Key insight:** The `@upstash/ratelimit` library already handles the fail-open case via `timeout` + `reason`. Phase 1 only adds decision logic on top of the existing response — no custom Redis timeout machinery needed.

---

## Common Pitfalls

### Pitfall 1: `reason === "timeout"` is Undefined on Success
**What goes wrong:** When Redis responds normally and the request is allowed, `reason` is `undefined` — not `"timeout"`. Checking `response.reason !== "timeout"` would be true even on success.
**Why it happens:** `reason` is only populated for non-standard outcomes (timeout, cacheBlock, denyList).
**How to avoid:** Only check `response.reason === "timeout"` as a positive assertion; undefined means normal Redis evaluation.
**Warning signs:** Donate route always returns 503 even when Redis is healthy.

### Pitfall 2: Redis Throws Instead of Timing Out
**What goes wrong:** If Redis is completely unreachable (connection refused), `limit()` may throw an exception rather than returning `{ reason: "timeout" }` — depends on how quickly the TCP connection fails vs. the timeout window.
**Why it happens:** Connection refused fails immediately (< 1ms) before the `timeout: 500` window elapses — the library may propagate the error rather than returning a timeout response.
**How to avoid:** Always wrap `ratelimit.limit()` in try/catch AND check `reason === "timeout"`. Apply fail strategy in both branches.
**Warning signs:** Donate route returns 500 (unhandled exception) rather than 503.

### Pitfall 3: Changing Return Type Breaks Existing Callers
**What goes wrong:** The current callers use `if (!(await checkRateLimit(...)))` — a boolean check. Changing the return to `RateLimitResult` breaks all three callers immediately.
**Why it happens:** Refactor changes the contract.
**How to avoid:** Update all three callers (`donate.ts`, `contact.ts`, `vrijwilligers.ts`) in the same commit as `security.ts`. TypeScript compilation will fail until all callers are updated — use this as a correctness check.
**Warning signs:** TypeScript compile error on `if (!rl)` — expected, must be resolved.

### Pitfall 4: `timeout: 500` Applies to the Whole Request Path
**What goes wrong:** Developers think 500ms is the total allowed request time. Actually it is only the Redis call timeout. The Vercel function still has its own timeout (10s default on Hobby, 60s on Pro).
**Why it happens:** Naming confusion.
**How to avoid:** Document clearly: `timeout: 500` only bounds the `ratelimit.limit()` call, not the full route handler.

### Pitfall 5: in-memory-fallback Route Still Gets 503 if Not Handled Correctly
**What goes wrong:** If `checkRateLimit` returns `{ allowed: false, source: 'hard-fail' }` for `in-memory-fallback` strategy, and the caller for contact/vrijwilligers checks only `!rl.allowed`, it would 429 the user rather than 503. That's acceptable. But if somehow the source logic is wrong and `hard-fail` is returned for fallback routes, those routes would signal incorrectly.
**Why it happens:** Logic error in the strategy branch.
**How to avoid:** The `in-memory-fallback` branch must NEVER return `source: 'hard-fail'` — that source is exclusive to the `hard-fail` strategy. Verify with a unit test in Phase 3.

---

## Code Examples

Verified patterns from official sources:

### `@upstash/ratelimit` Constructor with `timeout`
```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/features
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  timeout: 1000, // milliseconds — default is 5000
  analytics: true,
});
```

### `limit()` Response Type (from official methods docs)
```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/methods
interface RatelimitResponse {
  success: boolean;       // true = request allowed
  limit: number;          // max requests per window
  remaining: number;      // requests remaining
  reset: number;          // unix ms when window resets
  pending: Promise<void>; // background analytics write
  reason?: 'timeout' | 'cacheBlock' | 'denyList'; // set for non-standard outcomes
}
```

### Complete `checkRateLimit` Refactor Pattern
```typescript
// Project pattern — verified against official docs
export type FailStrategy = 'hard-fail' | 'in-memory-fallback';

export interface RateLimitResult {
  allowed: boolean;
  source: 'redis' | 'memory' | 'hard-fail';
}

export async function checkRateLimit(
  ip: string,
  failStrategy: FailStrategy,
  maxRequests: number = 5,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  if (ratelimit) {
    let response: Awaited<ReturnType<typeof ratelimit.limit>>;
    try {
      response = await ratelimit.limit(ip);
    } catch {
      // Redis threw (connection refused or similar) — apply fail strategy
      if (failStrategy === 'hard-fail') {
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, maxRequests, windowMs);
    }

    if (response.reason === 'timeout') {
      // Redis did not respond within timeout — library allowed by default, we override
      if (failStrategy === 'hard-fail') {
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, maxRequests, windowMs);
    }

    return { allowed: response.success, source: 'redis' };
  }

  // No Redis configured (local dev / missing env) — in-memory only
  return checkInMemoryFallback(ip, maxRequests, windowMs);
}

function checkInMemoryFallback(
  ip: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, source: 'memory' };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, source: 'memory' };
  }

  entry.count++;
  return { allowed: true, source: 'memory' };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Silent fail-open on Redis error | Typed fail-strategy per route | Phase 1 | Financial routes now hard-fail; non-financial degrade gracefully |
| Default 5000ms Redis timeout | `timeout: 500` | Phase 1 | Redis latency spikes no longer hold Vercel slots open |
| `checkRateLimit` returns `boolean` | Returns `RateLimitResult` with `source` | Phase 1 | Callers can differentiate 503 (unavailable) from 429 (rate limited) |

**Deprecated/outdated in this codebase:**
- `checkRateLimit(ip, maxRequests, windowMs)` signature: replaced by `checkRateLimit(ip, failStrategy, maxRequests, windowMs)` — existing callers must be updated in the same commit.

---

## Open Questions

1. **Does `@upstash/ratelimit` v2's `limit()` always return `reason: "timeout"` on timeout, or can it also throw?**
   - What we know: Official docs state `reason === "timeout"` is the signal. Connection refused scenarios may throw instead since they fail before timeout elapses.
   - What's unclear: Whether the library catches connection errors internally and wraps them as timeout responses, or lets them propagate.
   - Recommendation: Implement both branches (try/catch AND `reason === "timeout"` check) as shown in code examples — this is safe regardless of behavior.

2. **Are there other callers of `checkRateLimit` beyond the three API routes?**
   - What we know: Grep of the codebase shows `checkRateLimit` imported in `contact.ts`, `donate.ts`, `vrijwilligers.ts` only.
   - What's unclear: None — confirmed.
   - Recommendation: Update all three in Phase 1.

---

## Sources

### Primary (HIGH confidence)
- https://upstash.com/docs/redis/sdks/ratelimit-ts/features — `timeout` option description, milliseconds, default 5000ms
- https://upstash.com/docs/redis/sdks/ratelimit-ts/methods — `RatelimitResponse` type with `reason` field values (`"timeout"`, `"cacheBlock"`, `"denyList"`)

### Secondary (MEDIUM confidence)
- https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted — Constructor examples verified against features page

### Tertiary (LOW confidence)
- Community pattern: try/catch on `ratelimit.limit()` for connection-refused scenarios — not explicitly documented in official sources; inferred from standard Redis client behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing installed packages, no new dependencies
- Architecture: HIGH — `reason` field and `timeout` option verified in official docs
- Pitfalls: MEDIUM — `reason === "timeout"` vs thrown exception ambiguity is LOW (single source inference), rest is HIGH

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable library, @upstash/ratelimit v2 API unlikely to change)
