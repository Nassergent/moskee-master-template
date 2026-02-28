# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Logic modules: `kebab-case.ts` (e.g., `prayer-engine.ts`, `payment-validators.ts`, `donation-utils.ts`)
- Components: `PascalCase.astro` (e.g., `DonationCard.astro`, `Footer.astro`)
- API routes: `kebab-case.ts` (e.g., `contact.ts`, `donate.ts`, `mollie-webhook.ts`)
- Test files: `[name].test.ts` (e.g., `prayer-engine.test.ts`)

**Functions:**
- camelCase for all functions, both sync and async
- Helper functions prefixed with verbs: `validate*`, `format*`, `build*`, `calculate*`, `fetch*`, `check*`
- Pure logic functions: `computeAdhanTimes`, `getPrayerStatus`, `calculateDonationProgress`
- Utilities: `sanitize`, `escapeHtml`, `isValidEmail`

**Variables:**
- camelCase for constants and variables: `rateLimitMap`, `ratelimit`, `entry`, `nowMinutes`
- Underscore prefix for unused parameters: `_timezone`, `_key`
- UPPER_SNAKE_CASE for actual constants/enums only: `PRAYER_NAMES`, `PAYMENT_LIMITS`, `SEPA_COUNTRIES`
- English naming throughout (no Dutch in variable names)

**Types:**
- PascalCase for interfaces and type aliases: `PrayerEngineConfig`, `ComputedPrayerTimes`, `DonationProgress`, `ValidationResult`
- Discriminated unions with `type` field: `{ type: 'normal' | 'ramadan'; items: ... }`
- Optional fields marked with `?`: `actief?: boolean`, `note?: string`
- Nullable returns as `Type | null` not `Type?`

## Code Style

**Formatting:**
- No explicit formatter configured (.eslintrc, .prettierrc, prettier config absent)
- 2-space indentation (inferred from source)
- Line length: no strict limit, but pragmatic ~100 chars
- Trailing commas in object/array literals when multiline
- No semicolons at end of statements (inferred pattern, though some present for clarity)

**Linting:**
- No linter configured (no .eslintrc, eslint.config.js, or biome.json)
- TypeScript strict mode via `tsconfig.json` extending `astro/tsconfigs/strict`
- Type safety: all function parameters typed, return types explicit where needed

## Import Organization

**Order:**
1. Built-in/standard library (no examples in codebase, rarely used)
2. Third-party packages: `adhan`, `@mollie/api-client`, `@sanity/`, React, etc.
3. Type imports: `import type { APIRoute } from 'astro'`
4. Relative imports from `src/lib`: `from '../../lib/sanity'`, `from '../../lib/security'`
5. Comments for logical grouping within categories

**Path Aliases:**
- No aliases configured in tsconfig.json or astro.config
- Direct relative paths used: `../../lib/sanity`, `../../lib/logic/prayer-engine`
- Centralized exports in `src/lib/sanity.ts` re-export Sanity clients

**Example from prayer-engine.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  computeAdhanTimes,
  applyAdhanOffsets,
  // ... more imports
  type PrayerEngineConfig,
} from './prayer-engine';
```

## Error Handling

**Patterns:**
- Try-catch wrapping async operations in API routes and fetch helpers
- Error returns as JSON responses with `{ error: string }` in APIs
- Console logging: `console.error('Context:', error)` for debugging
- Graceful fallback returns: empty arrays `[]`, null values, or defaults (e.g., `PAYMENT_LIMITS.MIN`)
- Rate limiting: return 429 with JSON error message

**In fetchHelpers (src/lib/sanity.ts):**
```typescript
try {
  const result = await sanityClient.fetch(`...`);
  return result || [];
} catch (e) {
  console.error('Sanity fetch error:', e);
  return [];
}
```

**In API routes (src/pages/api/):**
```typescript
if (!validation.valid) {
  return new Response(JSON.stringify({ error: validation.error }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## Logging

**Framework:** console (no external logger imported)

**Patterns:**
- Direct `console.error()` for warnings and errors in fetch helpers
- Structured JSON logging in `src/lib/logic/logger.ts` via `formatLog()` utility
- Log context includes correlationId, tenantId, projectId for tracing
- Sensitive keys redacted automatically: `secret`, `token`, `apiKey`, `password`, etc.
- Log level: 'info' | 'warn' | 'error'

**Usage example:**
```typescript
const logEntry = formatLog('error', 'webhook_error',
  { correlationId, tenantId, paymentId },
  error
);
console.log(logEntry);
```

## Comments

**When to Comment:**
- Module header block (2-3 lines) describing purpose and constraints
- Complex algorithms or business logic: time calculations (DST), IBAN validation (MOD97)
- Configuration sections: "── Method Mapping ──", "── Display Formatters ──"
- Parameter explanations for unusual defaults or magic numbers
- Deprecation notices: `@deprecated Use X instead`

**Example from prayer-engine.ts:**
```typescript
/**
 * prayer-engine.ts — WaqfOS Native Prayer Engine
 *
 * Compartiment: LOGICA
 * Pure functies, geen side-effects, geen UI, geen API calls.
 * Alle berekeningen zijn timezone-aware via IANA timezone strings.
 */
```

**JSDoc/TSDoc:**
- JSDoc blocks for public exported functions with parameter docs
- Parameter descriptions: `@param name — Description`
- Return documentation: Inline via `Record<PrayerName, string>` types, not JSDoc
- Example: `/** Format seconds as "HH:MM:SS" countdown string */`

## Function Design

**Size:**
- Prefer pure functions <80 lines
- Complex logic broken into smaller helpers: `computeAdhanTimes()` calls utility formatters
- Pipeline composition: `computeFullPrayerTimes()` chains `computeAdhanTimes()` → `applyAdhanOffsets()` → `computeIqamaTimes()`

**Parameters:**
- Explicit typing required: `date: Date`, `config: PrayerEngineConfig`
- Optional params as interface fields with `?` in type
- No default parameters in signatures (use object spread instead: `{ ...defaults, ...overrides }`)
- Unused params prefixed with underscore: `_timezone`, `_key`

**Return Values:**
- Union types for validation: `ValidationResult` with `{ valid: boolean; amount?: number; error?: string }`
- Discriminated unions for state: `EffectiveSchedule` with `{ type: 'normal' | 'ramadan'; items: ... }`
- Nullable returns: `Type | null` (never optional `Type?`)
- Record types for keyed collections: `Record<PrayerName, string>`

**Example:**
```typescript
export function getPrayerStatus(
  now: Date,
  computedTimes: ComputedPrayerTimes
): PrayerStatus {
  // Pure, no side effects
  const tz = computedTimes.timezone;
  const nowMinutes = parseHHmm(formatTime(now, tz));
  // ... logic ...
  return { currentPrayer, nextPrayer, secondsUntilNext };
}
```

## Module Design

**Exports:**
- Explicit export syntax for public API: `export function`, `export interface`, `export const`
- Re-exports in barrel files: `src/lib/sanity.ts` re-exports Sanity clients for convenience
- No wildcard imports/exports
- Internal helpers marked `// ──` comment blocks and not exported

**Example from src/lib/sanity.ts:**
```typescript
import { sanityClient, freshClient, urlFor } from '../../sanity/lib/client';
export { sanityClient, freshClient, urlFor };

// writeClient is NOT re-exported here
export async function fetchSettings() { ... }
```

**Barrel Files:**
- `src/lib/sanity.ts` aggregates Sanity client + all fetch helpers
- Other logic modules are single-purpose, no barrel aggregation

**File Organization:**
- Logic modules (`src/lib/logic/`) are pure functions with no imports of Sanity clients
- API routes (`src/pages/api/`) import from both `src/lib/` and `src/lib/logic/`
- Components (`src/components/`) import from `src/lib/` for data fetching, `src/lib/logic/` for calculations

**Compartimentalization (UmmahOS Pattern):**
- **Sanity Layer** (`src/lib/sanity.ts`): Fetch operations, Sanity client setup
- **Logic Layer** (`src/lib/logic/`): Pure functions, no side effects, no env vars, no fetch
- **API Layer** (`src/pages/api/`): Request handling, calls logic then Sanity
- **Component Layer** (`src/components/`, `src/layouts/`): Rendering, calls Sanity layer

---

*Convention analysis: 2026-02-28*
