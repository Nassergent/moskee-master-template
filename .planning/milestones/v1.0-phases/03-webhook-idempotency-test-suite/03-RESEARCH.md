# Phase 3: Webhook Idempotency Test Suite - Research

**Researched:** 2026-02-28
**Domain:** Vitest unit testing — async timer mocking, module factory mocking, import.meta.env stubbing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WHTEST-01 | `processWebhook()` retourneert 503 wanneer Redis een timeout geeft (slow reject, gesimuleerd met fake timers) | vi.useFakeTimers + vi.advanceTimersByTimeAsync pattern documented below |
| WHTEST-02 | `processWebhook()` retourneert 503 wanneer Redis volledig onbereikbaar is (connection refused) | mockExists.mockRejectedValueOnce pattern; getRedis() lazy-init must be reset between tests |
| WHTEST-03 | `processWebhook()` verwerkt een payment slechts één keer wanneer dezelfde paymentId twee keer wordt aangeboden | mockExists returns 0 first call, 1 second call; mock writeClient.patch to assert call count |
| WHTEST-04 | Mollie webhook POST met getamperde HMAC signature wordt afgewezen | verifyHmacTimingSafe is pure and already testable; test at route level requires Astro POST handler isolation |
| WHTEST-05 | Shared `vi.mock('@upstash/redis')` factory is herbruikbaar across alle webhook test scenario's | vi.hoisted() pattern for shared mock refs; single vi.mock factory at file top |
| WHTEST-06 | Tests verifieren dat 503 paden een structured log entry emitten met `paymentId` en `tenantId` | WebhookResult.logs array returned by processWebhook(); parse JSON and assert fields |
</phase_requirements>

---

## Summary

Phase 3 adds four Vitest test scenarios that verify the webhook idempotency pipeline against every production Redis failure mode. The codebase already has a working `processWebhook()` function in `src/services/webhook-service.ts` that returns a `WebhookResult` object containing `{ status, body, logs }`. This makes unit testing straightforward: no HTTP server or Astro runtime is needed for WHTEST-01 through WHTEST-03 and WHTEST-06 — tests call `processWebhook(paymentId)` directly and inspect the returned value.

The HMAC test (WHTEST-04) is different: `verifyHmacTimingSafe()` in `src/lib/logic/webhook-validators.ts` is a pure async function that can be tested directly without mocking the Astro route. Testing the full route POST handler would require an Astro test harness (not available in this setup), so the correct approach is to test `verifyHmacTimingSafe()` directly with a tampered body/signature pair and assert it returns `false`.

The biggest technical challenge is the Redis timeout test (WHTEST-01). The production scenario is that `r.exists()` returns a Promise that resolves very slowly (Redis is up but lagging). The test must simulate this without a real network — using `vi.useFakeTimers()` so that `setTimeout` inside a delayed Promise is intercepted, then advancing time with `vi.advanceTimersByTimeAsync()` to trigger the slow-reject path. A synchronous `mockRejectedValue` would not test this scenario correctly.

**Primary recommendation:** Write all webhook service tests in one file (`src/services/webhook-service.test.ts`). Use a single `vi.mock('@upstash/redis')` factory with `vi.hoisted()` refs for `mockExists`, `mockSet`, `mockDel`. Reset mock implementations in `beforeEach`. Test the HMAC scenario in a separate file (`src/lib/logic/webhook-validators.test.ts`) by calling `verifyHmacTimingSafe()` directly.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner, mocking, fake timers | Already in devDependencies; `npm test` runs `vitest run` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vi (from vitest) | built-in | Module mocking, env stubbing, fake timers | All four test scenarios |
| crypto.subtle | Node built-in | HMAC computation in test helpers | Generating valid HMAC for WHTEST-04 baseline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `processWebhook()` call | Full HTTP layer test | HTTP layer test needs Astro runtime; direct call is faster and sufficient for all 503-path assertions |
| `vi.advanceTimersByTimeAsync` | `mockRejectedValue` with `setTimeout` | Sync rejection doesn't test slow-reject; fake timers accurately simulate Redis latency spike |

**Installation:**
No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Test File Structure
```
src/
├── services/
│   ├── webhook-service.ts              # Implementation (already exists)
│   └── webhook-service.test.ts         # NEW: WHTEST-01, 02, 03, 05, 06
├── lib/
│   └── logic/
│       ├── webhook-validators.ts       # Implementation (already exists)
│       └── webhook-validators.test.ts  # NEW: WHTEST-04
```

### Pattern 1: Shared vi.mock Factory with vi.hoisted

**What:** Define shared mock refs outside the vi.mock call using `vi.hoisted()`, then reference them inside the factory. This bypasses the hoisting constraint (vi.mock is moved to file top, but regular `const` declarations are not).

**When to use:** Any time you need the same mock spy accessible both inside `vi.mock()` and inside individual `it()` blocks to configure per-test behavior.

**Example:**
```typescript
// Source: https://vitest.dev/guide/mocking/modules
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processWebhook } from './webhook-service';

// vi.hoisted runs before module evaluation — refs are usable in vi.mock factory
const { mockExists, mockSet, mockDel } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    exists: mockExists,
    set: mockSet,
    del: mockDel,
  })),
}));

// Also mock Mollie so no network calls
vi.mock('@mollie/api-client', () => ({
  createMollieClient: vi.fn(),
}));

// Also mock Sanity write client
vi.mock('../../sanity/lib/client', () => ({
  writeClient: { patch: vi.fn(() => ({ inc: vi.fn(() => ({ commit: vi.fn() })) })) },
}));

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
  vi.stubEnv('MOLLIE_API_KEY', 'live_test'); // non-test_ key forces real flow
  vi.stubEnv('SANITY_PROJECT_ID', 'test-tenant');
  mockExists.mockReset();
  mockSet.mockReset();
  mockDel.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});
```

**Critical detail:** `webhook-service.ts` uses a module-level `let redis: Redis | null = null` with a `redisChecked` flag. This means the Redis instance is cached after first call. You MUST reset this module state between tests. The cleanest approach is `vi.resetModules()` in `beforeEach` combined with dynamic imports, OR mock the module before the flag is ever set (works when the test file is fresh). See Pitfall 2 below.

### Pattern 2: Redis Timeout Test with Fake Timers

**What:** Simulate a slow Promise that never resolves within timeout, using `vi.useFakeTimers()` so `setTimeout` is intercepted, then advance clock to trigger rejection.

**When to use:** WHTEST-01 — the production scenario where Redis is up but lagging past the 500ms timeout.

**Example:**
```typescript
// Source: https://vitest.dev/api/vi.html#vi-advancetimersbytimasync
it('WHTEST-01: returns 503 when Redis times out (slow reject)', async () => {
  // Arrange: exists() returns a Promise that resolves after 2000ms
  mockExists.mockImplementation(
    () => new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 2000)
    )
  );

  vi.useFakeTimers();
  const promise = processWebhook('tr_test123');

  // Advance past the timeout to trigger rejection
  await vi.advanceTimersByTimeAsync(3000);
  const result = await promise;

  vi.useRealTimers();

  expect(result.status).toBe(503);
  expect(result.body).toBe('Service temporarily unavailable');
});
```

**Why advanceTimersByTimeAsync and not advanceTimersByTime:** The async variant flushes microtasks between each timer tick, allowing chained `.then()` / `await` continuations inside `processWebhook` to run. The synchronous variant would advance the clock but leave Promise continuations pending.

### Pattern 3: Connection Refused (Immediate Rejection)

**What:** Mock `exists()` to reject immediately to simulate Redis being completely unavailable.

**Example:**
```typescript
it('WHTEST-02: returns 503 when Redis is completely unavailable', async () => {
  mockExists.mockRejectedValueOnce(new Error('ECONNREFUSED'));

  const result = await processWebhook('tr_test456');

  expect(result.status).toBe(503);
  expect(result.body).toBe('Service temporarily unavailable');
  // WHTEST-06: structured log must contain paymentId and tenantId
  const log503 = result.logs
    .map(l => JSON.parse(l))
    .find(l => l.event === 'webhook_error');
  expect(log503).toBeDefined();
  expect(log503.paymentId).toBe('tr_test456');
  expect(log503.tenantId).toBeDefined();
});
```

### Pattern 4: Idempotency (Duplicate Delivery)

**What:** Call `processWebhook()` twice with same paymentId. Second call must return 'Already processed' with zero Sanity writes.

**Example:**
```typescript
it('WHTEST-03: processes payment only once (idempotency)', async () => {
  // First call: not processed yet
  mockExists.mockResolvedValueOnce(0);   // r.exists() → 0 = not found
  mockSet.mockResolvedValue('OK');       // lock acquire
  // ... configure Mollie mock to return paid payment ...

  const first = await processWebhook('tr_idempotent1');
  expect(first.status).toBe(200);

  // Second call: already processed
  mockExists.mockResolvedValueOnce(1);   // r.exists() → 1 = found
  const second = await processWebhook('tr_idempotent1');

  expect(second.status).toBe(200);
  expect(second.body).toBe('Already processed');
  // Assert no Sanity writes on second call
  const { writeClient } = await import('../../sanity/lib/client');
  expect(vi.mocked(writeClient.patch)).toHaveBeenCalledTimes(1); // only from first call
});
```

### Pattern 5: HMAC Tampered Signature Test

**What:** Test `verifyHmacTimingSafe()` directly. Generate a valid HMAC for a body, then pass a modified body — expect `false`. Separately test that an invalid base64 signature also returns `false`.

**Example:**
```typescript
// src/lib/logic/webhook-validators.test.ts
import { describe, it, expect } from 'vitest';
import { verifyHmacTimingSafe } from './webhook-validators';

async function generateHmac(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

it('WHTEST-04: tampered body fails HMAC verification', async () => {
  const secret = 'test-secret';
  const originalBody = 'id=tr_test123';
  const tamperedBody = 'id=tr_malicious';

  const validSig = await generateHmac(secret, originalBody);
  const result = await verifyHmacTimingSafe(secret, tamperedBody, validSig);
  expect(result).toBe(false);
});

it('WHTEST-04: valid body + valid signature passes', async () => {
  const secret = 'test-secret';
  const body = 'id=tr_test123';
  const sig = await generateHmac(secret, body);
  expect(await verifyHmacTimingSafe(secret, body, sig)).toBe(true);
});
```

### Anti-Patterns to Avoid

- **Testing the route-level POST handler for WHTEST-04:** The Astro `POST: APIRoute` function depends on `request.headers`, `request.text()`, `import.meta.env`, and the full Astro runtime. This cannot be called without an Astro test adapter. Test `verifyHmacTimingSafe()` directly instead — this is the function that performs the security check.
- **Using `mockRejectedValue` for WHTEST-01:** This simulates an immediate rejection, not a slow one. The requirement specifically mandates `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` because Mollie's real concern is latency (Redis accepting the connection but responding slowly).
- **Per-test vi.mock calls:** `vi.mock()` is hoisted and only runs once per file. Per-test mock setup must use `mockImplementation` / `mockResolvedValueOnce` on shared refs, not new `vi.mock()` calls.
- **Forgetting vi.useRealTimers() after fake timers test:** Leaving fake timers active will cause subsequent tests (including tests in other files if running concurrently) to behave incorrectly. Call `vi.useRealTimers()` in `afterEach` or immediately after the assertion.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared mock state across tests | Per-test `vi.mock()` calls or manual spy tracking | `vi.hoisted()` refs + single `vi.mock()` factory | vi.mock() is hoisted once; vi.hoisted() is the official API for this pattern |
| Slow timer simulation | `new Promise(r => setTimeout(r, 2000))` without fake timers | `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` | Real setTimeout would make test take 2+ seconds and not be reproducible |
| HMAC generation in tests | Custom HMAC libraries | `crypto.subtle.sign()` (built-in Node/Web) | Same algorithm as the implementation; no extra dep needed |
| Environment variable setup | Process.env mutation | `vi.stubEnv()` | Automatically restored after each test; no manual cleanup |

---

## Common Pitfalls

### Pitfall 1: Redis Module-Level Caching (CRITICAL)
**What goes wrong:** `webhook-service.ts` initializes `redis` once at module level and caches it via `redisChecked`. If the module is loaded without env vars set, `redis` stays `null` for all tests in the file — even after `vi.stubEnv()`.
**Why it happens:** ES module evaluation happens once. `getRedis()` sets `redisChecked = true` on first call and never re-reads env vars.
**How to avoid:** Two valid approaches:
1. Set env vars via `vi.stubEnv()` BEFORE any import of `webhook-service.ts` — ensure they are set at module load time.
2. Use `vi.resetModules()` in `beforeEach` and dynamic `await import('./webhook-service')` inside each test to get a fresh module with env vars already stubbed.

Approach 2 is more robust but adds verbosity. Approach 1 works if all tests in the file use the same Redis availability assumption (they do — all tests that exercise the 503 path need Redis env vars set so `getRedis()` returns a mock instance).

**Warning signs:** Tests pass in isolation but fail when run together; `processWebhook` always returns `503` body `'Service temporarily unavailable'` with `step: 'redis_required'` even when you expect Redis to be available.

### Pitfall 2: vi.advanceTimersByTimeAsync Must Be Awaited
**What goes wrong:** Calling `vi.advanceTimersByTimeAsync(3000)` without `await` means the clock advances but Promise continuations haven't resolved before assertions run.
**Why it happens:** The method returns a Promise; forgetting `await` makes the test non-deterministic.
**How to avoid:** Always `await vi.advanceTimersByTimeAsync(N)`. Pattern: start the processWebhook call, then advance timers, then await the result.
**Warning signs:** Assertions run before the 503 is returned; test appears to pass with wrong status code.

### Pitfall 3: Mollie Client Must Be Mocked for Non-HMAC Tests
**What goes wrong:** `processWebhook()` calls `createMollieClient({ apiKey: mollieKey })` and `mollieClient.payments.get(paymentId)`. Without mocking, this makes real network requests or throws because the API key is a test string.
**Why it happens:** The production code path calls Mollie unconditionally after the idempotency check. For WHTEST-01 and WHTEST-02, `mockExists` throws before reaching Mollie — but for WHTEST-03 (idempotency), the first call must succeed past the Redis check and reach Mollie.
**How to avoid:** Add `vi.mock('@mollie/api-client')` at the top of the test file. For WHTEST-03, configure the mock to return a `{ status: 'paid', amount: { value: '10.00', currency: 'EUR' }, metadata: {...} }` payment object.
**Warning signs:** WHTEST-03 first call returns 500 or hangs; Mollie API errors in test output.

### Pitfall 4: Sanity writeClient Must Be Mocked for Idempotency Test
**What goes wrong:** WHTEST-03 first call reaches the Sanity commit step. Without mocking, `writeClient.patch()` attempts a real Sanity API call.
**How to avoid:** `vi.mock('../../sanity/lib/client', ...)` with a chained mock: `patch: vi.fn(() => ({ inc: vi.fn(() => ({ commit: vi.fn().mockResolvedValue({ huidigBedragCents: 1000 }) })) }))`.
**Warning signs:** First call in WHTEST-03 hangs or throws `TypeError: Cannot read properties of undefined`.

### Pitfall 5: Log Assertions Must Parse JSON
**What goes wrong:** `result.logs` contains JSON-serialized strings (from `formatLog()` which calls `JSON.stringify()`). Asserting `result.logs.some(l => l.includes('paymentId'))` works but is fragile — it matches string literals inside JSON values.
**How to avoid:** Parse each log entry with `JSON.parse()` before asserting field presence. Example: `result.logs.map(l => JSON.parse(l)).find(l => l.paymentId === 'tr_test')`.
**Warning signs:** Assertions pass for wrong reasons (substring match on serialized keys rather than actual property values).

### Pitfall 6: MOLLIE_API_KEY Must NOT Start with 'test_' for Most Tests
**What goes wrong:** `webhook-service.ts` checks `if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx')` and returns `{ status: 200, body: 'OK (demo)', logs }` immediately if true. Tests using `vi.stubEnv('MOLLIE_API_KEY', 'test_xxxxxxxxxxxx')` will skip the entire Redis/idempotency flow.
**How to avoid:** Use a non-demo key value like `'live_fakekeyfortesting'` in `vi.stubEnv()` for all tests that need to exercise the full flow.
**Warning signs:** processWebhook always returns `{ status: 200, body: 'OK (demo)' }` regardless of Redis mock behavior.

---

## Code Examples

Verified patterns from official sources:

### Full Test File Skeleton: webhook-service.test.ts
```typescript
// src/services/webhook-service.test.ts
// Source: https://vitest.dev/guide/mocking/modules + https://vitest.dev/api/vi.html

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// WHTEST-05: Shared mock refs via vi.hoisted — accessible both in vi.mock factory and in tests
const { mockExists, mockSet, mockDel } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

// WHTEST-05: Single shared vi.mock factory for @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    exists: mockExists,
    set: mockSet,
    del: mockDel,
  })),
}));

vi.mock('@mollie/api-client', () => ({
  createMollieClient: vi.fn(() => ({
    payments: {
      get: vi.fn().mockResolvedValue({
        status: 'paid',
        amount: { value: '25.00', currency: 'EUR' },
        metadata: {
          projectId: 'proj_test',
          tenantId: 'tenant_test',
          correlationId: 'corr_test',
          projectName: 'Test Project',
        },
      }),
    },
  })),
}));

vi.mock('../../sanity/lib/client', () => ({
  writeClient: {
    patch: vi.fn(() => ({
      inc: vi.fn(() => ({
        commit: vi.fn().mockResolvedValue({ huidigBedragCents: 2500 }),
      })),
    })),
  },
}));

// Also mock payment-service to avoid email dispatch
vi.mock('../services/payment-service', () => ({
  processSuccessfulPayment: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  // Set env vars before module lazy-init
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake-redis.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
  vi.stubEnv('MOLLIE_API_KEY', 'live_fakekeyfortesting'); // NOT test_ — must exercise real flow
  vi.stubEnv('SANITY_PROJECT_ID', 'test-tenant-id');

  mockExists.mockReset();
  mockSet.mockReset();
  mockDel.mockReset();
  // Default: lock acquires successfully, del succeeds
  mockSet.mockResolvedValue('OK');
  mockDel.mockResolvedValue(1);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers(); // safety: ensure fake timers never leak
});
```

### WHTEST-01: Fake Timer Slow Reject
```typescript
it('WHTEST-01: returns 503 when Redis times out (slow reject via fake timers)', async () => {
  // Source: https://vitest.dev/api/vi.html#vi-advancetimersbytimasync
  mockExists.mockImplementation(
    () => new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('Redis timeout after 2000ms')), 2000)
    )
  );

  vi.useFakeTimers();
  const resultPromise = processWebhook('tr_timeout001');
  await vi.advanceTimersByTimeAsync(3000);
  const result = await resultPromise;
  vi.useRealTimers();

  expect(result.status).toBe(503);
  // WHTEST-06: structured log contains paymentId + tenantId
  const errorLog = result.logs.map(l => JSON.parse(l)).find(l => l.level === 'error');
  expect(errorLog?.paymentId).toBe('tr_timeout001');
  expect(errorLog?.tenantId).toBeDefined();
});
```

### WHTEST-02: Connection Refused
```typescript
it('WHTEST-02: returns 503 when Redis is completely unavailable (ECONNREFUSED)', async () => {
  mockExists.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:6379'));

  const result = await processWebhook('tr_connrefused001');

  expect(result.status).toBe(503);
  expect(result.body).toBe('Service temporarily unavailable');
  // WHTEST-06
  const errorLog = result.logs.map(l => JSON.parse(l)).find(l => l.level === 'error');
  expect(errorLog?.paymentId).toBe('tr_connrefused001');
  expect(errorLog?.tenantId).toBeDefined();
});
```

### WHTEST-03: Idempotency
```typescript
it('WHTEST-03: processes payment only once — second call returns Already processed with zero Sanity patches', async () => {
  const { writeClient } = await import('../../sanity/lib/client');
  const mockPatch = vi.mocked(writeClient.patch);

  // First call: not yet processed
  mockExists.mockResolvedValueOnce(0);
  const first = await processWebhook('tr_idem001');
  expect(first.status).toBe(200);

  // Second call: already processed
  mockExists.mockResolvedValueOnce(1);
  const second = await processWebhook('tr_idem001');

  expect(second.status).toBe(200);
  expect(second.body).toBe('Already processed');
  // patch was called exactly once (from first call only)
  expect(mockPatch).toHaveBeenCalledTimes(1);
});
```

### WHTEST-04: HMAC Tampered Signature
```typescript
// src/lib/logic/webhook-validators.test.ts
import { describe, it, expect } from 'vitest';
import { verifyHmacTimingSafe } from './webhook-validators';

async function signBody(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe('WHTEST-04: HMAC signature verification', () => {
  it('valid body + matching signature → true', async () => {
    const body = 'id=tr_test123';
    const sig = await signBody('my-secret', body);
    expect(await verifyHmacTimingSafe('my-secret', body, sig)).toBe(true);
  });

  it('tampered body + original signature → false', async () => {
    const original = 'id=tr_test123';
    const tampered = 'id=tr_attacker999';
    const sig = await signBody('my-secret', original);
    expect(await verifyHmacTimingSafe('my-secret', tampered, sig)).toBe(false);
  });

  it('wrong secret → false', async () => {
    const body = 'id=tr_test123';
    const sig = await signBody('real-secret', body);
    expect(await verifyHmacTimingSafe('wrong-secret', body, sig)).toBe(false);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest `jest.mock()` hoisting with `__mocks__` | Vitest `vi.mock()` + `vi.hoisted()` for shared refs | Vitest 0.26+ | No `__mocks__` directory needed; refs declared inline |
| Fake timers via `jest.useFakeTimers()` | `vi.useFakeTimers()` (identical API surface) | Vitest initial | No migration needed; API is identical |
| `process.env.X = 'value'` in tests | `vi.stubEnv('X', 'value')` + automatic restoration | Vitest 0.23+ | No manual cleanup; no env pollution across tests |
| `mockReturnValue` for async | `mockResolvedValue` / `mockResolvedValueOnce` | Jest 27+ / Vitest | Cleaner; correctly wraps in Promise |

**Note on Vitest 4.0:** No breaking changes to `vi.useFakeTimers`, `vi.mock`, or `vi.stubEnv` API signatures were found in the official docs as of 2026-02-28. The API documented in vitest.dev matches Vitest 4.0.18.

---

## Open Questions

1. **Redis module-level caching in webhook-service.ts**
   - What we know: `let redis: Redis | null = null` and `redisChecked` are module-level. `vi.stubEnv()` sets env vars but cannot retroactively change already-evaluated module code.
   - What's unclear: Whether calling `vi.stubEnv()` in `beforeEach` before the first `processWebhook()` call is sufficient, or whether `vi.resetModules()` is needed between tests.
   - Recommendation: Set env vars at the TOP of the test file (before any imports) using `vi.stubEnv()` at module scope, or use `vi.resetModules()` + dynamic imports in `beforeEach`. Validate by running WHTEST-01 and WHTEST-02 in the same test file and confirming both receive a non-null Redis mock instance.

2. **payment-service.ts mock path**
   - What we know: `webhook-service.ts` imports `processSuccessfulPayment` from `'./payment-service'`. This sends emails — must be mocked for tests to not require Resend API keys.
   - What's unclear: Whether `vi.mock('./payment-service')` needs the full relative path from the test file or from the source file.
   - Recommendation: In `webhook-service.test.ts`, mock as `vi.mock('./payment-service', ...)` since the test file is co-located with the service file.

3. **fetchProjectById / fetchProjectByTitle Sanity calls**
   - What we know: WHTEST-03's first call (successful payment) may call `fetchProjectByTitle()` if metadata has no projectId. This calls Sanity network.
   - Recommendation: In the Mollie mock, always return metadata with a valid `projectId` to avoid the legacy fallback path and eliminate the need to mock Sanity fetch helpers.

---

## Validation Architecture

(Note: `workflow.nyquist_validation` is not present in `.planning/config.json` — this section is included as the phase IS a test phase and the planner needs this mapping.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | None (Vitest uses Vite config from astro.config.mjs via vite: {} integration) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WHTEST-01 | processWebhook() → 503 on Redis slow-reject | unit | `npm test -- --reporter=verbose` | No — Wave 0 |
| WHTEST-02 | processWebhook() → 503 on ECONNREFUSED | unit | `npm test -- --reporter=verbose` | No — Wave 0 |
| WHTEST-03 | Second processWebhook() → Already processed + 0 Sanity patches | unit | `npm test -- --reporter=verbose` | No — Wave 0 |
| WHTEST-04 | verifyHmacTimingSafe() → false on tampered body | unit | `npm test -- --reporter=verbose` | No — Wave 0 |
| WHTEST-05 | Shared vi.mock factory (structural requirement, not a runtime assertion) | N/A — code structure | Code review of test file | No — Wave 0 |
| WHTEST-06 | 503 paths emit structured log with paymentId + tenantId | unit (embedded in WHTEST-01 + 02) | `npm test -- --reporter=verbose` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/webhook-service.test.ts` — covers WHTEST-01, 02, 03, 05, 06
- [ ] `src/lib/logic/webhook-validators.test.ts` — covers WHTEST-04 (may extend existing file if prayer-engine.test.ts pattern is followed, but separate file is cleaner)

*(Note: `src/lib/logic/prayer-engine.test.ts` already exists and confirms Vitest is properly wired — no framework setup needed.)*

---

## Sources

### Primary (HIGH confidence)
- https://vitest.dev/api/vi.html — `vi.useFakeTimers`, `vi.advanceTimersByTimeAsync`, `vi.stubEnv`, `vi.hoisted` signatures
- https://vitest.dev/guide/mocking/modules — `vi.mock` factory pattern, hoisting behavior, `vi.hoisted()` for shared refs
- `src/services/webhook-service.ts` — direct code inspection of `processWebhook()`, `WebhookResult`, Redis lazy-init pattern
- `src/lib/logic/webhook-validators.ts` — direct inspection of `verifyHmacTimingSafe()`
- `src/lib/logic/logger.ts` — direct inspection of `formatLog()` return type (JSON string)
- `src/lib/logic/prayer-engine.test.ts` — existing test file confirming Vitest import pattern and test conventions used in this project

### Secondary (MEDIUM confidence)
- https://vitest.dev/guide/mocking — module mocking guide, verified against source code inspection
- https://runebook.dev/en/articles/vitest/api/vi/vi-advancetimersbytimeasync — `advanceTimersByTimeAsync` usage pattern

### Tertiary (LOW confidence)
- None — all critical claims are verified against official Vitest docs or direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vitest is already in devDependencies and working (prayer-engine.test.ts passes)
- Architecture: HIGH — based on direct code inspection of webhook-service.ts and official Vitest docs
- Pitfalls: HIGH — Redis lazy-init caching is directly observable in the source; timer/mock pitfalls verified against Vitest docs
- HMAC test pattern: HIGH — verifyHmacTimingSafe() is pure; crypto.subtle is the same API in test and production

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (Vitest 4.x is stable; webhook-service.ts is implementation-stable for this milestone)
