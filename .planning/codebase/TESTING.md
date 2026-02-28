# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: No explicit vitest.config.* file (uses Astro defaults)
- TypeScript: Full support via tsconfig strict mode

**Assertion Library:**
- Vitest's built-in expect() API (compatible with Jest)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode for continuous testing
npm test                 # Alias (matches "npm run test")
```

## Test File Organization

**Location:**
- Co-located with source: `src/lib/logic/[name].test.ts` in same directory as `[name].ts`
- Single test file per module: `prayer-engine.test.ts` tests `prayer-engine.ts`

**Naming:**
- File pattern: `[module-name].test.ts`
- Describe blocks: descriptive scenario in quotes: `'Brussels normal day (2026-01-15)'`
- Test cases: imperative "returns X" or "validates Y" format

**Structure:**
```
src/lib/logic/
├── prayer-engine.ts
├── prayer-engine.test.ts
├── payment-validators.ts
├── donation-utils.ts
├── education.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature area (specific scenario)', () => {
  // Setup helpers specific to this suite
  function makeConfig(overrides = {}): Config {
    return { ...defaults, ...overrides };
  }

  it('returns expected result', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**

1. **Helper Functions** - Create factory functions for test data at describe block scope:
```typescript
function makeConfig(overrides: Partial<PrayerEngineConfig> = {}): PrayerEngineConfig {
  return {
    coordinates: { lat: 50.8503, lng: 4.3517 }, // Brussels
    timezone: 'Europe/Brussels',
    method: 'MuslimWorldLeague',
    madhab: 'shafi',
    highLatitudeRule: 'middleOfTheNight',
    ...overrides,
  };
}
```

2. **Validation Helpers** - Extract validation logic for DRY test assertions:
```typescript
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
```

3. **Arrange-Act-Assert** - Minimal, readable structure:
```typescript
it('Dhuhr is around noon (11:30-13:30)', () => {
  const config = makeConfig();
  const date = new Date(2026, 0, 15);
  const times = computeAdhanTimes(date, config);

  const m = timeToMinutes(times.dhuhr);
  expect(m).toBeGreaterThan(11 * 60 + 30);
  expect(m).toBeLessThan(13 * 60 + 30);
});
```

## Mocking

**Framework:** None used in current codebase
- Tests focus on pure functions (no mocking needed)
- No external service mocking (APIs, databases not called in tests)
- Vitest can mock if needed, but preferred pattern is pure testing

**Patterns:**
- **What NOT to mock:** Pure logic functions, date calculations, string formatting
- **When to consider mocking:** External APIs (Mollie, Sanity), file I/O, network calls
- Current approach: Keep test scope to deterministic pure functions only

**For future mocking if needed:**
```typescript
import { vi } from 'vitest';

// If testing async functions
vi.mock('./external-service', () => ({
  fetchData: vi.fn().mockResolvedValue({ ... })
}));
```

## Fixtures and Factories

**Test Data:**
Factories defined at describe-block scope (not separate fixture files):

```typescript
function makeConfig(overrides: Partial<PrayerEngineConfig> = {}): PrayerEngineConfig {
  return {
    coordinates: { lat: 50.8503, lng: 4.3517 }, // Brussels
    timezone: 'Europe/Brussels',
    method: 'MuslimWorldLeague',
    madhab: 'shafi',
    highLatitudeRule: 'middleOfTheNight',
    ...overrides,
  };
}

// Usage in tests
const config = makeConfig();
const configStockholm = makeConfig({
  coordinates: { lat: 59.3293, lng: 18.0686 },
  timezone: 'Europe/Stockholm',
});
```

**Location:**
- Factories inline at describe-block scope in test file
- No separate `fixtures/` or `test-data/` directories
- Overrides pattern for variations: `makeConfig({ timezone: 'Europe/Paris' })`

## Coverage

**Requirements:** Not enforced
- No coverage threshold configured in vitest
- No coverage reports in CI/CD
- Coverage tracking: not implemented

**View Coverage:**
```bash
# If coverage commands added to package.json:
npm run test:coverage     # Would generate coverage report
```

## Test Types

**Unit Tests:**
- Scope: Single pure function with deterministic inputs/outputs
- Approach: Test all branches of logic, edge cases, boundary conditions
- Example: `computeAdhanTimes()` tested across different locations, seasons, DST transitions

**Integration Tests:**
- Not explicitly separated from unit tests
- Would test function pipelines: `computeFullPrayerTimes()` calls `computeAdhanTimes()` → `applyAdhanOffsets()` → `computeIqamaTimes()`
- See "Full Pipeline" describe block in prayer-engine.test.ts

**E2E Tests:**
- Not implemented
- Would require browser testing framework (Playwright, Cypress)
- Current focus: API-level testing via vitest, not browser simulation

## Common Patterns

**Async Testing:**
- Current codebase has no async tests (all tested functions are sync pure logic)
- If needed, use `async/await` in test body:
```typescript
it('fetches and transforms data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

**Error Testing:**
- Validation functions return error in result object (not throw):
```typescript
it('returns error when payment amount invalid', () => {
  const result = validatePaymentAmount('abc');
  expect(result.valid).toBe(false);
  expect(result.error).toBeDefined();
});
```

**Date/Time Testing:**
- Test with explicit Date objects covering edge cases:
  - DST transitions: March 29, 2026 (start), October 25, 2026 (end)
  - Extreme latitudes: Stockholm summer solstice (June 21)
  - Boundary times: before Fajr, after Isha, midnight wrap-around

```typescript
describe('DST start day (2026-03-29)', () => {
  const config = makeConfig();
  const date = new Date(2026, 2, 29); // March 29, 2026
  const times = computeAdhanTimes(date, config);

  it('all prayers return valid times on DST transition', () => {
    for (const name of PRAYER_NAMES) {
      expect(isValidTime(times[name])).toBe(true);
    }
  });
});
```

**Validation Testing:**
- Test interfaces as discriminated unions:
```typescript
describe('Iqama fixed time', () => {
  const iqamaConfig = {
    fajr: { enabled: true, type: 'fixed' as const, time: '07:00' },
    asr: { enabled: false, type: 'offset' as const, minutes: 10 },
  };

  it('respects enabled flag', () => {
    const iqama = computeIqamaTimes(adhanTimes, iqamaConfig, 'Europe/Brussels');
    expect(iqama.fajr).toBe('07:00');
    expect(iqama.asr).toBeNull();
  });
});
```

**Boundary Testing:**
- Test wrap-around at midnight:
```typescript
it('wraps around midnight correctly', () => {
  const lateIsha = { ...base, isha: '23:50' };
  const result = applyAdhanOffsets(lateIsha, { isha: 15 });
  expect(result.isha).toBe('00:05');
});
```

**Null/Optional Testing:**
- Use `toBeNull()` for expected null returns:
```typescript
it('returns null when iqama disabled', () => {
  const config = { asr: { enabled: false } };
  const result = computeIqamaTimes(adhanTimes, config, tz);
  expect(result.asr).toBeNull();
});
```

## Test Characteristics

**Philosophy:** Pure, deterministic, fast
- No network calls
- No file I/O
- No database access
- No external service dependencies
- Run in <5ms per test

**Current Test Count:** 1 test file with 12+ describe blocks covering:
1. Brussels normal day
2. DST start
3. DST end
4. Stockholm high latitude
5. Iqama offsets
6. Iqama fixed times
7. Adhan offsets
8. Jumu'ah passthrough
9. Config completeness check
10. Prayer status determination
11. Full pipeline
12. Sanity config builder

**Running Tests:**
```bash
cd /c/Users/info/Desktop/moskee-master-template
npm run test              # Run all tests (vitest run)
npm run test:watch       # Watch mode
```

---

*Testing analysis: 2026-02-28*
