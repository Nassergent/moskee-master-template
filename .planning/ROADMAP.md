# Roadmap: Security Hardening — Redis Failover + Webhook Idempotency

## Overview

This milestone closes two specific production security gaps in the moskee-master-template platform. Phase 1 establishes the typed `FailStrategy` foundation that all rate-limiting callers depend on. Phase 2 replaces the existing unbounded in-memory Map with a bounded LRU cache and adds structured logging on every fallback path. Phase 3 adds four Vitest test scenarios against the webhook idempotency pipeline, covering Redis unavailability, timeouts, duplicate delivery, and HMAC replay. No new routes or Sanity schemas are introduced — this is surgical hardening of two existing subsystems.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: FailStrategy Foundation** - Harden `checkRateLimit()` with typed per-route fail strategies and update all callers
- [ ] **Phase 2: In-Memory LRU + Observability** - Replace unbounded Map with bounded LRU cache and add structured fallback logging
- [ ] **Phase 3: Webhook Idempotency Test Suite** - Cover all four critical Redis failure scenarios with Vitest

## Phase Details

### Phase 1: FailStrategy Foundation
**Goal**: The rate-limiting layer enforces the correct failure behavior per route — donation route hard-fails on Redis outage, non-financial routes degrade gracefully
**Depends on**: Nothing (first phase)
**Requirements**: RATE-01, RATE-02, RATE-03, RATE-05
**Success Criteria** (what must be TRUE):
  1. `checkRateLimit()` accepts a `failStrategy` parameter typed as `'hard-fail' | 'in-memory-fallback'` — callers that omit it get a type error
  2. A POST to `/api/donate` when Redis is unreachable returns HTTP 503, not a silent pass-through
  3. A POST to `/api/contact` or `/api/vrijwilligers` when Redis is unreachable falls through to the in-memory path without returning 503
  4. `@upstash/ratelimit` instance is constructed with `timeout: 500` so Redis latency spikes do not hold Vercel invocation slots open beyond 500ms
**Plans:** 1 plan

Plans:
- [ ] 01-01-PLAN.md — Refactor checkRateLimit with typed FailStrategy + update all 3 API callers

### Phase 2: In-Memory LRU + Observability
**Goal**: The in-memory fallback is bounded and observable — no unbounded Map growth, every fallback activation emits a structured log entry
**Depends on**: Phase 1
**Requirements**: RATE-04, RATE-06
**Success Criteria** (what must be TRUE):
  1. The existing `rateLimitMap` (plain `Map`) is replaced by an `LRUCache` instance with a configured `max` entries cap and per-entry `ttl`
  2. When the in-memory fallback path activates, a structured log entry is emitted containing `source` (`memory` or `hard-fail`), route identifier, and hashed IP
  3. When the donate route returns 503 due to Redis unavailability, a structured log entry is emitted containing `source: 'hard-fail'`, route, and hashed IP
**Plans**: TBD

### Phase 3: Webhook Idempotency Test Suite
**Goal**: The webhook idempotency pipeline has verified test coverage for all four critical failure scenarios — no production Redis failure mode is untested
**Depends on**: Nothing (fully independent — can run in parallel with Phases 1-2, sequenced here for clarity)
**Requirements**: WHTEST-01, WHTEST-02, WHTEST-03, WHTEST-04, WHTEST-05, WHTEST-06
**Success Criteria** (what must be TRUE):
  1. `vitest run` passes four new tests covering: Redis timeout, Redis completely unavailable, duplicate webhook delivery, and tampered HMAC signature
  2. The Redis timeout test uses `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` — not a synchronous mock rejection — so the slow-reject production scenario is accurately simulated
  3. The duplicate webhook test asserts that `processWebhook()` returns `'Already processed'` on the second call and that zero Sanity patch calls are made
  4. A shared `vi.mock('@upstash/redis')` factory is reused across all Redis scenario tests — no per-test duplication of mock setup
  5. Every test that exercises a 503 response path asserts that a structured log entry was emitted containing `paymentId` and `tenantId`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. FailStrategy Foundation | 0/1 | Not started | - |
| 2. In-Memory LRU + Observability | 0/? | Not started | - |
| 3. Webhook Idempotency Test Suite | 0/? | Not started | - |
