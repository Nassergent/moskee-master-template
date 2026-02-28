---
plan: 02-01
title: "HMAC Verificatie Fix"
status: complete
started: "2026-02-28"
completed: "2026-02-28"
---

# Summary: 02-01 HMAC Verificatie Fix

## What shipped

Replaced fragile API key format detection (`startsWith('test_')`, `=== 'test_xxxxxxxxxxxx'`) with explicit `WEBHOOK_SKIP_VERIFICATION` env var for controlling HMAC verification and demo mode.

## Tasks completed

| Task | Status | What it did |
|------|--------|-------------|
| 2.1 | ✓ | Replaced `startsWith('test_')` in mollie-webhook.ts with env var check, log as ERROR |
| 2.2 | ✓ | Replaced `=== 'test_xxxxxxxxxxxx'` in webhook-service.ts with env var check |
| 2.3 | ✓ | Added `WEBHOOK_SKIP_VERIFICATION` to .env.example with safety warning |

## Key files

### Modified
- `src/pages/api/mollie-webhook.ts` — HMAC skip now uses env var + ERROR log
- `src/services/webhook-service.ts` — demo mode check uses env var
- `src/lib/logic/logger.ts` — added `hmac_verification_skipped` event
- `.env.example` — documented new env var

## Commits
- `ae7f7ed` fix(02-01): replace HMAC test_ check with WEBHOOK_SKIP_VERIFICATION env var

## Self-Check: PASSED
- No `startsWith('test_')` in webhook files
- No `'test_xxxxxxxxxxxx'` in webhook-service
- TypeScript compiles clean
