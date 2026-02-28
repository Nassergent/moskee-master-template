# Phase 2: In-Memory LRU + Observability - Research

**Researched:** 2026-02-28
**Domain:** LRU cache replacement for unbounded Map + structured logging on rate-limit fallback paths
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RATE-04 | Replace unbounded `rateLimitMap` (plain `Map`) with `LRUCache` instance with configurable `max` entries and per-entry `ttl` | lru-cache v11.2.6 `LRUCache` constructor with `max` + `ttl` options — direct drop-in for the existing `Map` in `src/lib/security.ts` |
| RATE-06 | Every fallback or 503 response logs a structured entry with `source` (`redis` \| `memory` \| `hard-fail`), route, and hashed IP | Project already has `formatLog()` in `logger.ts`; needs two new `LogEvent` values and `crypto.createHash('sha256')` for IP hashing |
</phase_requirements>

## Summary

Phase 2 makes two surgical changes to `src/lib/security.ts`. First, the bare `const rateLimitMap = new Map<...>()` is replaced by an `LRUCache` instance from the `lru-cache` package. The `LRUCache` provides a hard `max` cap (no unbounded growth), plus per-entry `ttl` so expired entries are never returned without a separate cleanup job. Second, every code path that returns a fallback or 503 result must emit one `console.log(formatLog(...))` line with the fields `source`, `route`, and `hashedIp`.

The project already owns everything needed: `lru-cache` v11.2.6 is available (verified via `npm view lru-cache version`), the logger utility at `src/lib/logic/logger.ts` already defines `formatLog()` with `sanitizeContext()`, and Node.js built-in `crypto` is available in the Vercel/Astro SSR runtime with no additional install. The only work is wiring these three pieces together inside `security.ts` — no new files, no new dependencies, no API contract changes.

The two callers of `checkInMemoryFallback` today are the Redis-timeout path and the Redis-throw path inside `checkRateLimit`. A third call site (no Redis configured at all) also routes through `checkInMemoryFallback`. The donate route returns `{ allowed: false, source: 'hard-fail' }` without calling `checkInMemoryFallback` — it needs its own log call at the hard-fail return sites. All five API callers (`donate`, `contact`, `vrijwilligers`, `evenement-aanmelding`, `mollie-webhook`) pass route identity via the `ip` parameter today — the function signature must accept a `route` string so the log can include it, or callers must pass it separately.

**Primary recommendation:** Add `route: string` as a new required parameter to `checkRateLimit()` (TypeScript enforces it at every call site), swap the `Map` for `LRUCache` with `max: 500, ttl: 60_000`, and emit `console.log(formatLog(...))` inside `checkInMemoryFallback` and at both hard-fail return points.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lru-cache` | 11.2.6 | Bounded in-memory cache with TTL and LRU eviction | Industry standard; rewritten in TypeScript; ships its own types; only requires `max` or `ttl` to be set; no additional runtime; used widely across Node.js ecosystem |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto` (built-in) | N/A | SHA-256 hash of IP address for log privacy | Always — no install, available in Vercel SSR runtime, already consistent with `webhook-validators.ts` pattern in the project |
| `src/lib/logic/logger.ts` (existing) | project | `formatLog()` + `sanitizeContext()` structured JSON log formatter | Already present in project — extend with two new `LogEvent` values |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `lru-cache` | `tiny-lru` | `tiny-lru` is smaller (~1KB) but lacks per-entry TTL; `lru-cache` is the standard and already in the npm ecosystem |
| `lru-cache` | Hand-rolled doubly-linked-list LRU | Complex, bug-prone, untested edge cases around TTL and concurrent access |
| `crypto` SHA-256 | Truncated IP (last two octets) | Less privacy-preserving and not one-way; SHA-256 is the accepted pattern for GDPR-safe log pseudonymization |
| `console.log(formatLog(...))` | Pino / Winston | Adding a logging framework dependency for what is 2-3 console.log calls in a serverless function is over-engineering; `formatLog()` already exists in the project |

**Installation:**
```bash
npm install lru-cache
```
(lru-cache v11.2.6 is the current latest as verified via `npm view lru-cache version`)

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to:
```
src/
└── lib/
    ├── security.ts          # Replace Map with LRUCache; add route param; add log calls
    └── logic/
        └── logger.ts        # Add two new LogEvent values: 'rate_limit_fallback', 'rate_limit_hard_fail'
```

Five callers updated to pass `route` argument:
```
src/pages/api/
├── contact.ts               # checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/contact')
├── vrijwilligers.ts         # checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/vrijwilligers')
├── evenement-aanmelding.ts  # checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/evenement-aanmelding')
├── donate.ts                # checkRateLimit(ip, 'hard-fail', 5, 60_000, '/api/donate')
└── mollie-webhook.ts        # checkRateLimit(ip, 'in-memory-fallback', ..., '/api/mollie-webhook')
```

### Pattern 1: LRUCache as drop-in for Map with TTL eviction

**What:** Replace `new Map<string, { count: number; resetAt: number }>()` with `LRUCache` where the TTL is the rate-limit window and `max` is a hard entry cap.

**When to use:** Any in-memory structure that can grow unboundedly per unique key (IP addresses, session IDs).

**Example:**
```typescript
// Source: https://github.com/isaacs/node-lru-cache README + npm view lru-cache version = 11.2.6
import { LRUCache } from 'lru-cache';

// Replace the bare Map:
// const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
//                ↓
const rateLimitMap = new LRUCache<string, { count: number; resetAt: number }>({
  max: 500,     // hard cap — oldest entries evicted when exceeded
  ttl: 60_000,  // 60 seconds — matches the rate-limit window; expired entries not returned
});

// get/set/has API is identical to Map for this usage:
const entry = rateLimitMap.get(ip);   // returns undefined if expired or evicted
rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
```

**Key difference from Map:** `rateLimitMap.get(ip)` returns `undefined` for expired entries — the caller already handles this case (`if (!entry || ...)`) so no logic change is needed.

### Pattern 2: Structured log emission at fallback / hard-fail points

**What:** Emit one `console.log(formatLog(...))` at each fallback activation, including hashed IP for GDPR compliance.

**When to use:** Every path where `source` is `'memory'` or `'hard-fail'` (not `'redis'` — normal Redis operation is not a fallback event).

**Example:**
```typescript
// Source: src/lib/logic/logger.ts (existing project logger)
import { createHash } from 'node:crypto';
import { formatLog } from './logic/logger';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// Inside checkInMemoryFallback — emit AFTER computing result, BEFORE returning:
const result: RateLimitResult = { allowed: ..., source: 'memory' };
console.log(formatLog('warn', 'rate_limit_fallback', {
  source: result.source,
  route,
  hashedIp: hashIp(ip),
}));
return result;

// Inside checkRateLimit hard-fail return paths:
console.log(formatLog('warn', 'rate_limit_hard_fail', {
  source: 'hard-fail',
  route,
  hashedIp: hashIp(ip),
}));
return { allowed: false, source: 'hard-fail' };
```

### Pattern 3: Extending LogEvent union in logger.ts

**What:** Add two new `LogEvent` literal values to the union type in `logger.ts`.

**Why needed:** `formatLog()` takes a typed `LogEvent` parameter — TypeScript will reject an unregistered string literal.

```typescript
// In src/lib/logic/logger.ts — extend the LogEvent union:
export type LogEvent =
  | 'webhook_received'
  | 'lock_acquired'
  // ... existing values ...
  | 'rate_limit_fallback'   // ← new: in-memory path activated (RATE-06)
  | 'rate_limit_hard_fail'; // ← new: hard-fail 503 path activated (RATE-06)
```

### Anti-Patterns to Avoid

- **Setting TTL on each `set()` call instead of constructor-level TTL:** `lru-cache` supports per-entry TTL override in `set()`, but since all rate-limit entries use the same window (`windowMs`), use the constructor-level `ttl` for simplicity and consistency. Mixing the two creates confusion.
- **Logging on every Redis success:** Only log on fallback/hard-fail paths. Logging every `checkRateLimit` call at production volume floods the Vercel log stream and adds latency.
- **Using `ttlAutopurge: true`:** In a serverless context (Vercel), invocations are short-lived; the LRU eviction on `max` overflow is sufficient. `ttlAutopurge` runs a background interval that is unnecessary and incompatible with short-lived serverless instances.
- **Passing raw IP to logs:** Always hash before logging. Raw IPs are personal data under GDPR.
- **Shadowing `route` as a new optional parameter:** Make `route` required, not optional. TypeScript enforcement at all five call sites prevents a future caller from silently omitting it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bounded cache with LRU eviction | Custom doubly-linked-list + size counter | `lru-cache` | O(1) get/set/eviction; handles TTL expiry; edge cases around LRU ordering under concurrent access are notoriously tricky |
| TTL-based entry expiry | `setTimeout` per entry, or manual `Date.now()` check on get | `lru-cache` TTL option | `setTimeout` per entry creates memory leaks in serverless; manual checks require wrapper functions; `lru-cache` handles both transparently |
| Privacy-safe IP representation in logs | Truncating IP to /24 subnet | `crypto.createHash('sha256')` | Truncated IPs are still personal data; SHA-256 one-way hash is the standard pseudonymization approach |
| Structured log formatting | Custom `JSON.stringify` with manual field ordering | `formatLog()` from `logger.ts` | Already exists in project, handles error serialization, truncates long strings, redacts sensitive keys |

**Key insight:** The project already has 90% of the pieces. `checkInMemoryFallback` already computes a `RateLimitResult` with a `source` field — it just needs to emit that to the log before returning. The `Map` already has `get/set` semantics that `LRUCache` preserves — the swap is minimal.

## Common Pitfalls

### Pitfall 1: LRUCache TTL does not auto-delete entries — it only suppresses stale returns

**What goes wrong:** Developer assumes expired entries are cleaned from memory immediately when TTL elapses. In reality, `lru-cache` by default returns `undefined` on `get()` for expired entries, but the entry stays in memory until the cache reaches `max` and eviction occurs (or `ttlAutopurge` is enabled).

**Why it happens:** Misreading the README; confusing TTL semantics with expiry-on-set.

**How to avoid:** For this use case, this is fine — the cache is bounded by `max: 500` so entries will be evicted by LRU pressure. The `get()` returning `undefined` for expired entries is the correct behavior (treated as "no entry" by `checkInMemoryFallback`).

**Warning signs:** If `max` is set very high (e.g., 100,000+), expired entries can accumulate. Keep `max` at 500 for this use case.

### Pitfall 2: `checkRateLimit` signature change breaks TypeScript callers

**What goes wrong:** Adding `route: string` as a new parameter shifts the parameter order, breaking existing callers with a TypeScript error.

**Why it happens:** Parameters are positional. If `route` is inserted between `ip` and `failStrategy`, all five callers break immediately.

**How to avoid:** Add `route` as the **second** parameter (after `ip`, before `failStrategy`) or as the **last** parameter. Adding it last is the lower-risk change — existing callers get a type error pointing to the missing argument, not a silent wrong-value substitution.

**Warning signs:** TypeScript compiler error `Expected 5 arguments, but got 4` at all five call sites — this is the correct expected failure mode, easily fixed.

### Pitfall 3: Logging inside `checkInMemoryFallback` logs on EVERY call, not only on Redis-failure activations

**What goes wrong:** `checkInMemoryFallback` is also called when Redis is simply not configured (local dev / missing env vars). In that case, `source: 'memory'` is normal operation, not a degraded fallback.

**Why it happens:** The function is called in two contexts: (a) Redis failed → genuine fallback, (b) no Redis configured → normal in-memory mode. RATE-06 only requires logging on genuine fallback activations.

**How to avoid:** Pass a boolean `isFallback` or check `ratelimit !== null` at the call site. Only emit the log when `ratelimit !== null` (i.e., Redis was configured but failed). The no-Redis case (local dev) should not spam logs.

**Warning signs:** Developer sees `rate_limit_fallback` in local dev logs on every request — that signals the guard is missing.

### Pitfall 4: `lru-cache` v11 requires Node >= 20

**What goes wrong:** Installing `lru-cache` v11 in an environment running Node 18 causes a runtime error.

**Why it happens:** v11.0 dropped Node < 20 support (confirmed in CHANGELOG).

**How to avoid:** Verify the Vercel project uses Node 20+. Vercel's default runtime has been Node 20 since mid-2024 for new projects. The existing `package.json` has no `engines` field — check Vercel dashboard or `.nvmrc` if unsure. Alternative: pin `lru-cache@10.x` if Node 18 must be supported (same API, same TTL support).

**Warning signs:** `SyntaxError: Unexpected token` or `ERR_MODULE_NOT_FOUND` at import time in Node 18.

## Code Examples

Verified patterns from official sources:

### Complete updated `src/lib/security.ts` structure (critical sections)

```typescript
// Source: lru-cache v11.2.6 README (https://github.com/isaacs/node-lru-cache)
// Source: src/lib/logic/logger.ts (existing project logger)
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { formatLog } from './logic/logger';

// Bounded in-memory fallback — replaces bare Map
// max: 500 = hard cap on unique IPs tracked simultaneously
// ttl: 60_000 = entries expire after 60s (matches the rate-limit window)
const rateLimitMap = new LRUCache<string, { count: number; resetAt: number }>({
  max: 500,
  ttl: 60_000,
});

// IP pseudonymization for GDPR-compliant logging
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function checkInMemoryFallback(
  ip: string,
  route: string,
  maxRequests: number,
  windowMs: number,
  emitLog: boolean  // true only when Redis was configured but failed
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);  // returns undefined for expired or evicted entries

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    const result: RateLimitResult = { allowed: true, source: 'memory' };
    if (emitLog) {
      console.log(formatLog('warn', 'rate_limit_fallback', {
        source: 'memory',
        route,
        hashedIp: hashIp(ip),
      }));
    }
    return result;
  }

  if (entry.count >= maxRequests) {
    const result: RateLimitResult = { allowed: false, source: 'memory' };
    if (emitLog) {
      console.log(formatLog('warn', 'rate_limit_fallback', {
        source: 'memory',
        route,
        hashedIp: hashIp(ip),
      }));
    }
    return result;
  }

  entry.count++;
  const result: RateLimitResult = { allowed: true, source: 'memory' };
  if (emitLog) {
    console.log(formatLog('warn', 'rate_limit_fallback', {
      source: 'memory',
      route,
      hashedIp: hashIp(ip),
    }));
  }
  return result;
}

export async function checkRateLimit(
  ip: string,
  failStrategy: FailStrategy,
  maxRequests: number = 5,
  windowMs: number = 60_000,
  route: string = 'unknown'  // add as last param to avoid breaking callers before update
): Promise<RateLimitResult> {
  if (ratelimit) {
    let response: Awaited<ReturnType<typeof ratelimit.limit>>;
    try {
      response = await ratelimit.limit(ip);
    } catch {
      if (failStrategy === 'hard-fail') {
        console.log(formatLog('warn', 'rate_limit_hard_fail', {
          source: 'hard-fail',
          route,
          hashedIp: hashIp(ip),
        }));
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, route, maxRequests, windowMs, true);
    }

    if (response.reason === 'timeout') {
      if (failStrategy === 'hard-fail') {
        console.log(formatLog('warn', 'rate_limit_hard_fail', {
          source: 'hard-fail',
          route,
          hashedIp: hashIp(ip),
        }));
        return { allowed: false, source: 'hard-fail' };
      }
      return checkInMemoryFallback(ip, route, maxRequests, windowMs, true);
    }

    return { allowed: response.success, source: 'redis' };
  }

  // No Redis configured — normal in-memory mode, no log
  return checkInMemoryFallback(ip, route, maxRequests, windowMs, false);
}
```

### Caller update pattern (same for all 5 API routes)

```typescript
// Before (Phase 1 output):
const rl = await checkRateLimit(ip, 'in-memory-fallback', 3, 60_000);

// After (Phase 2):
const rl = await checkRateLimit(ip, 'in-memory-fallback', 3, 60_000, '/api/contact');
```

### logger.ts LogEvent extension

```typescript
// Source: src/lib/logic/logger.ts (existing)
export type LogEvent =
  | 'webhook_received'
  | 'lock_acquired'
  | 'lock_exists'
  | 'already_processed'
  | 'mollie_fetched'
  | 'payment_not_paid'
  | 'sanity_commit_ok'
  | 'sanity_commit_retry'
  | 'sanity_commit_failed'
  | 'processed_set'
  | 'email_sent'
  | 'webhook_complete'
  | 'webhook_error'
  | 'reconcile_start'
  | 'reconcile_complete'
  | 'reconcile_diff'
  | 'rate_limit_fallback'    // ← Phase 2: in-memory path activated when Redis configured
  | 'rate_limit_hard_fail';  // ← Phase 2: hard-fail 503 returned (donate route)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Map<string, ...>()` for rate-limit buckets | `new LRUCache<string, ...>({ max, ttl })` | Phase 2 | Hard cap on memory growth; no unbounded accumulation under traffic spike |
| Silent fallback activation | `console.log(formatLog('warn', 'rate_limit_fallback', ...))` | Phase 2 | Every degraded path now leaves a structured trace in Vercel logs |
| Raw IP in potential future logs | `createHash('sha256').update(ip).digest('hex').slice(0,16)` | Phase 2 | GDPR-compliant pseudonymization from day one |

**Deprecated/outdated:**
- Bare `new Map()` for per-IP counters: unbounded growth under sustained traffic or IP spoofing; no expiry semantics.

## Open Questions

1. **Should `route` be required or optional with a default?**
   - What we know: Making it required (`route: string`) enforces correctness at all 5 call sites via TypeScript. Making it optional with a default `'unknown'` avoids breaking callers before they are updated.
   - What's unclear: The planner can choose either approach. Required is safer long-term; optional default is safer as an incremental change.
   - Recommendation: Add as optional with default `'unknown'` in the function signature so all 5 callers compile immediately, then update them in the same plan. This avoids a broken intermediate state.

2. **Should logs be emitted on `allowed: true` fallback activations, or only on `allowed: false`?**
   - What we know: RATE-06 says "every fallback or 503 response logs a structured entry" — "fallback" implies the fallback path was taken, regardless of the rate-limit decision.
   - What's unclear: High-traffic deployments emit a log on every single in-memory fallback request (allowed or denied), which could be verbose.
   - Recommendation: Log on every fallback activation (allowed or denied) per RATE-06 wording. The log is `warn` level, appropriate for degraded operation.

3. **What value for `max` in LRUCache?**
   - What we know: No production traffic data is available. The `max` cap prevents unbounded growth but if set too low, legitimate IPs get evicted prematurely (treated as new visitors, bypassing rate-limit counts).
   - What's unclear: Peak concurrent unique IPs to the platform.
   - Recommendation: `max: 500` is a safe default for a mosque platform (not high-volume public API). This can be moved to a constant `RATE_LIMIT_CACHE_MAX = 500` for easy future tuning.

## Sources

### Primary (HIGH confidence)
- `npm view lru-cache version` → `11.2.6` — verified current version as of 2026-02-28
- https://github.com/isaacs/node-lru-cache README — `LRUCache` constructor API (`max`, `ttl`, `set`/`get`/`has`)
- https://github.com/isaacs/node-lru-cache CHANGELOG — v11 breaking change: Node >= 20 required
- `src/lib/security.ts` — existing code read directly; `rateLimitMap` is `new Map<string, ...>()`
- `src/lib/logic/logger.ts` — existing `formatLog()` + `LogEvent` union + `sanitizeContext()`
- `src/pages/api/donate.ts` / `contact.ts` / `vrijwilligers.ts` / `evenement-aanmelding.ts` — all 5 callers read directly; confirmed `checkRateLimit` signature and call patterns
- Node.js built-in `crypto` module — `createHash('sha256')` is stable built-in, no install needed

### Secondary (MEDIUM confidence)
- WebSearch: SHA-256 IP hashing for GDPR log pseudonymization — multiple authoritative Node.js crypto sources confirm `createHash('sha256').update(ip).digest('hex')` pattern

### Tertiary (LOW confidence)
- WebSearch: `max: 500` as a reasonable default for a low-volume platform — engineering judgment, not from official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `lru-cache` version confirmed from npm registry; API verified from official GitHub README
- Architecture: HIGH — existing code read directly; change is minimal and confined to one file + one config extension
- Pitfalls: HIGH — derived from direct inspection of the existing code and lru-cache CHANGELOG; TTL semantics confirmed from README

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (lru-cache is stable; Node crypto is built-in; logger.ts is project-owned)
