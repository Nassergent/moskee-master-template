# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: No explicit vitest.config file detected (using defaults)

**Assertion Library:**
- Vitest built-in (`expect()`)

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run test:watch   # Watch mode (vitest)
```

**Entry Points:**
- Test files co-located in same directories as source: `src/lib/logic/*.test.ts`, `src/services/*.test.ts`
- Current test count: 2 test files with ~50+ test cases

## Test File Organization

**Location:**
- Co-located with source files (not separate `/tests` directory)
- Pattern: `[filename].test.ts`

**Current Tests:**
- `src/lib/logic/prayer-engine.test.ts` (12 describe blocks, 40+ assertions)
- `src/lib/logic/webhook-validators.test.ts` (HMAC verification, 3 test cases)
- `src/services/webhook-service.test.ts` (Redis failure + idempotency, 3 test cases)

**Naming Convention:**
- Test blocks use descriptive names: `'Brussels normal day (2026-01-15)'`, `'DST start day'`, `'Iqama offset calculation'`
- Test cases use `it()` (no `.only` or `.skip` patterns found)

## Test Structure

**Suite Organization (Prayer Engine example):**
```typescript
import { describe, it, expect } from 'vitest';
import { computeAdhanTimes, PRAYER_NAMES } from './prayer-engine';

// Helper functions defined at top
function makeConfig(overrides: Partial<PrayerEngineConfig> = {}): PrayerEngineConfig {
  return { coordinates: { lat: 50.8503, lng: 4.3517 }, timezone: 'Europe/Brussels', ...overrides };
}

describe('Brussels normal day (2026-01-15)', () => {
  const config = makeConfig();
  const date = new Date(2026, 0, 15);
  const times = computeAdhanTimes(date, config);

  it('returns all 5 prayer times', () => {
    for (const name of PRAYER_NAMES) {
      expect(times[name]).toBeDefined();
      expect(isValidTime(times[name])).toBe(true);
    }
  });

  it('prayers are in correct chronological order', () => {
    const minutes = PRAYER_NAMES.map(n => timeToMinutes(times[n]));
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    }
  });
});
```

**Patterns:**
- No `beforeEach` in logic tests (pure functions, no setup needed)
- Constants computed once per describe block (shared across tests in that block)
- Helper functions at module level for time parsing, validation

**Webhook Service Tests (Integration-Style):**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExists, mockSet, mockDel } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () {
    return { exists: mockExists, set: mockSet, del: mockDel };
  }),
}));

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake-redis.upstash.io');
  mockExists.mockReset();
  mockSet.mockResolvedValue('OK');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('Webhook Service — Redis failure modes + idempotency', () => {
  it('WHTEST-01: returns 503 when Redis times out', async () => {
    // ... test implementation
  });
});
```

**Patterns:**
- `vi.hoisted()` for shared mock refs (accessible in both mock factory and tests)
- `vi.mock()` for module mocking (registered before imports)
- `vi.stubEnv()` for environment variable testing
- `vi.useFakeTimers()` / `vi.useRealTimers()` for async delay simulation
- `mockFn.mockResolvedValue()`, `mockFn.mockRejectedValueOnce()` for promise handling

## Mocking Strategy

**Framework:** Vitest `vi.mock()`, `vi.fn()`, `vi.hoisted()`

**Pattern 1: Direct Module Mocking (Webhook Service Tests)**
```typescript
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () {
    return { exists: mockExists, set: mockSet, del: mockDel };
  }),
}));

vi.mock('@mollie/api-client', () => ({
  createMollieClient: vi.fn(() => ({
    payments: {
      get: vi.fn().mockResolvedValue({
        status: 'paid',
        amount: { value: '25.00', currency: 'EUR' },
        metadata: { projectId: 'proj_test', tenantId: 'tenant_test', ... },
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
```

**Pattern 2: Hoisted Mock Refs**
```typescript
const { mockExists, mockSet, mockDel } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () {
    return { exists: mockExists, set: mockSet, del: mockDel };
  }),
}));

// Later, in tests:
mockExists.mockResolvedValueOnce(0);  // ← can reference from test body
const result = await processWebhook('tr_test');
expect(mockExists).toHaveBeenCalledWith(...);
```

**What Gets Mocked:**
- External APIs: `@upstash/redis`, `@mollie/api-client`
- Sanity client: `sanity/lib/client` (prevents network calls)
- Dependent services: `payment-service`, Sanity fetch helpers
- Crypto not mocked (Web Crypto API available in Node 18+)

**What NOT Mocked:**
- Pure logic functions (no mocks needed; testable standalone)
- Date/time (use `vi.useFakeTimers()` when needed)
- Built-ins like TextEncoder, crypto.subtle

## Test Coverage

**Current Coverage:**
- `src/lib/logic/prayer-engine.ts` - comprehensive (DST, high latitude, offsets, full pipeline)
- `src/lib/logic/webhook-validators.ts` - HMAC verification tested
- `src/services/webhook-service.ts` - Redis failure modes, idempotency tested
- `src/services/email-service.ts` - NOT TESTED
- `src/services/payment-service.ts` - NOT TESTED
- `src/pages/api/*` - NOT TESTED
- `src/components/*` - NOT TESTED (Astro components)

**Requirements:** None enforced (no coverage threshold in config)

**View Coverage:**
```bash
# Not currently configured; would require:
npm test -- --coverage
```

## Test Types

### Unit Tests (Prayer Engine)

**Scope:** Pure computation functions in isolation

**Examples:**
- `computeAdhanTimes()` with various locations (Brussels, Stockholm), dates (DST transitions), configurations
- `computeIqamaTimes()` with offset and fixed time configurations
- `applyAdhanOffsets()` with positive, negative, and midnight-wrapping offsets
- `isEngineConfigComplete()` with missing fields
- `getPrayerStatus()` at different times of day

**Approach:**
- Arrange (setup date, config) → Act (call function) → Assert (check output format, ordering, values)
- No external dependencies; deterministic inputs
- Test edge cases: DST transitions, high latitude rules, null iqama entries

### Integration Tests (Webhook Service)

**Scope:** Service with mocked external dependencies (Redis, Mollie, Sanity)

**Examples:**
- Redis timeout → returns 503
- Redis ECONNREFUSED → returns 503
- Idempotency: first call processes, second call returns 200 OK + no Sanity patch
- HMAC signature verification with tampered body
- Payment already processed (Redis key exists)

**Approach:**
- Mock external services completely
- Test failure modes, recovery paths, concurrency safety
- Verify structured logging (JSON events, paymentId, tenantId included)
- Use fake timers for slow async operations (2000ms timeout simulation)

### E2E Tests

**Not Present:** No Cypress, Playwright, or similar
- Would test full request flows: `/api/donate` → Mollie payment → webhook → Sanity update → email
- Currently manual testing only (dev verification on staging)

## Specific Test Patterns

### Async Testing with Fake Timers (Webhook Service)

```typescript
it('WHTEST-01: returns 503 when Redis times out (slow reject via fake timers)', async () => {
  mockExists.mockImplementation(
    () => new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('Redis timeout after 2000ms')), 2000)
    )
  );

  vi.useFakeTimers();
  const resultPromise = processWebhook('tr_timeout001');

  // Advance clock past the delay
  await vi.advanceTimersByTimeAsync(3000);
  const result = await resultPromise;

  vi.useRealTimers();

  expect(result.status).toBe(503);
});
```

**Key Points:**
- `vi.useFakeTimers()` before creating promises that depend on timers
- `vi.advanceTimersByTimeAsync()` (not regular `advanceTimersBy()`) flushes microtasks
- Always restore with `vi.useRealTimers()` in `afterEach`

### Error Testing with Mock Resolution Sequences

```typescript
it('WHTEST-03: processes payment only once — second call returns Already processed', async () => {
  // First call: not yet processed (exists() returns 0)
  mockExists.mockResolvedValueOnce(0);
  const first = await processWebhook('tr_idem001');
  expect(first.status).toBe(200);

  // Second call: already processed (exists() returns 1)
  mockExists.mockResolvedValueOnce(1);
  const second = await processWebhook('tr_idem001');
  expect(second.status).toBe(200);
  expect(second.body).toBe('Already processed');

  // Verify Sanity patch called exactly once (from first call only)
  expect(mockPatch).toHaveBeenCalledTimes(1);
});
```

**Key Points:**
- `mockFn.mockResolvedValueOnce()` for sequence testing (different return per call)
- Can verify call counts: `toHaveBeenCalledTimes()`
- Can verify call arguments: `toHaveBeenCalledWith()`

### Pure Function Testing (Validators)

```typescript
describe('WHTEST-04: HMAC signature verification', () => {
  it('valid body + matching signature returns true', async () => {
    const body = 'id=tr_test123';
    const sig = await signBody('my-secret', body);
    expect(await verifyHmacTimingSafe('my-secret', body, sig)).toBe(true);
  });

  it('tampered body + original signature returns false', async () => {
    const original = 'id=tr_test123';
    const tampered = 'id=tr_attacker999';
    const sig = await signBody('my-secret', original);
    expect(await verifyHmacTimingSafe('my-secret', tampered, sig)).toBe(false);
  });
});
```

**Key Points:**
- Helper functions (`signBody()`) defined within test file
- Each test is independent; can run in any order
- Crypto operations are async; properly await
- No mocks needed for pure cryptographic functions

## Testing Gaps and Priorities

### Critical Gaps (High Priority)

**1. Email Service (`src/services/email-service.ts`)**
- Currently untested
- Uses Resend API (external)
- Tests needed for: template rendering, HTML generation, attachment handling
- Risk: Silent failures in email delivery

**2. Mollie Payment Creation (`src/pages/api/donate.ts`)**
- POST handler not tested
- Tests needed for: amount validation, origin check, rate limiting, Mollie API call
- Risk: Payment flow silently fails

**3. Contact Form (`src/pages/api/contact.ts`)**
- Multipart/form-data file upload handling untested
- Tests needed for: file type validation, size limits, email dispatch
- Risk: File uploads silently fail or cause errors

### Medium Priority Gaps

**4. Payment Reconciliation Job (`src/pages/api/jobs/reconcile-mollie.ts`)**
- Cron job logic untested
- Tests needed for: Mollie pagination, Sanity updates, recovery from partial failures
- Risk: Donation amounts fall out of sync

**5. Event Registration (`src/pages/api/evenement-aanmelding.ts`)**
- Registration flow untested
- Tests needed for: event capacity checks, duplicate prevention, email confirmation
- Risk: Overbooking possible

### Component Tests (Lower Priority)

**6. Astro Components**
- No component tests (snapshot or rendering)
- Would require: @astrojs/testers or similar (not installed)
- Risk: UI regressions not caught in CI

**7. Sanity Integration**
- Fetch helpers not tested
- Tests would mock Sanity GROQ queries
- Risk: Query errors only caught in production

## Test Infrastructure

**Missing (Not Installed):**
- Coverage reporter (coverage tools)
- E2E framework (Playwright, Cypress)
- Component testing (Astro testing library)
- Visual regression testing
- Performance benchmarking

**Environment Variables for Tests:**
- Tested via `vi.stubEnv()` per test
- Critical env vars mocked: `UPSTASH_REDIS_REST_URL`, `MOLLIE_API_KEY`, `SANITY_PROJECT_ID`
- Demo mode guard tested: `if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx')`

## Recommended Test Additions

### Immediate (Before Next Release)

1. **Webhook API endpoint** (`src/pages/api/mollie-webhook.ts`)
   - Test HMAC verification success/failure
   - Test payment processing with mocked webhook payload
   - Test idempotency (same paymentId twice)

2. **Email Service** (`src/services/email-service.ts`)
   - Mock Resend API
   - Test template rendering with donation data
   - Test error handling when Resend fails

### Short Term (1-2 Sprints)

3. **Donate API** (POST /api/donate)
   - Test amount validation (boundary values)
   - Test CSRF origin check
   - Test rate limiting
   - Test Mollie payment creation

4. **Payment validators** (additional cases)
   - Current: basic amount validation
   - Add: IBAN validation edge cases, currency parsing

### Long Term

5. **E2E flow** (Playwright)
   - End-to-end: homepage → donate page → Mollie redirect → webhook → bedankt page

6. **Component snapshots** (Astro testing)
   - Navigation with different settings
   - Prayer grid with various timezone configs

---

*Testing analysis: 2026-02-28*
