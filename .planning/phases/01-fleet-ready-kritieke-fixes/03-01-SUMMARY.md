---
phase: 01-fleet-ready-kritieke-fixes
plan: 03-01
subsystem: payments
tags: [mollie, donate, frequency, cleanup]

# Dependency graph
requires: []
provides:
  - Frequency parameter removed from Mollie payment description logic
  - frequency kept in metadata with TODO comment for Subscriptions API
affects: [fleet-onboarding, donate-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead code removed from payment description: no conditional on frequency"
    - "Metadata preserved for future Subscriptions API integration"

key-files:
  created: []
  modified:
    - src/pages/api/donate.ts

key-decisions:
  - "Frequency removed from description conditional — flat 'Donatie — {mosqueName}' is clearer for fleet onboarding"
  - "frequency kept in metadata with TODO comment: implement via Mollie Subscriptions API when ready"

patterns-established:
  - "Payment description: project-specific description if project set, otherwise flat 'Donatie — {mosqueName}'"

requirements-completed: [FLEET-03]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 3 Plan 1: Frequency Parameter Cleanup Summary

**Removed frequency-conditional branching from Mollie payment description, replacing 'Maandelijkse donatie'/'Donatie' toggle with a flat 'Donatie — {mosqueName}' fallback while preserving frequency in metadata for future Subscriptions API**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T19:08:00Z
- **Completed:** 2026-02-28T19:10:32Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed `frequency === 'maandelijks'` conditional from description logic
- Replaced with flat `Donatie — ${mosqueName}` fallback
- Added TODO comment to `frequency` metadata field explaining future Mollie Subscriptions API intent
- TypeScript compiles clean, no regressions

## Task Commits

Each task was committed atomically:

1. **Task 3.1: Remove frequency from Mollie description logic** - `7b02816` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/api/donate.ts` - Removed frequency conditional from description; added TODO on metadata field

## Decisions Made

- None beyond what was already decided in STATE.md — plan followed exactly as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-01 complete. Frequency dead code cleaned up.
- `frequency` remains in metadata for future Mollie Subscriptions API without breaking anything.
- Ready to continue with remaining plans in phase 01-fleet-ready-kritieke-fixes.

---
*Phase: 01-fleet-ready-kritieke-fixes*
*Completed: 2026-02-28*
