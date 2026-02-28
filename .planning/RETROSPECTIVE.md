# Retrospective

## Milestone: v1.0 — Security Hardening

**Shipped:** 2026-02-28
**Phases:** 3 | **Plans:** 4

### What Was Built
- Typed per-route fail strategy for rate limiting (hard-fail vs in-memory-fallback)
- Bounded LRU cache (max 500, TTL 60s) replacing unbounded Map
- Structured JSON logging on all fallback/hard-fail paths with hashed IPs
- Webhook idempotency test suite: Redis timeout, ECONNREFUSED, duplicate delivery
- HMAC tampered signature verification tests

### What Worked
- Research-first approach caught key pitfalls early (arrow fn vs function for vi.mock, emitLog boolean for local dev)
- Single-plan phases kept scope tight — 2 tasks per plan, 4-7 files per plan
- Parallel execution of Phase 3 plans (03-01 + 03-02) saved time
- Auto-discovery of 2 extra callers (evenement-aanmelding, mollie-webhook) during Phase 1 execution

### What Was Inefficient
- No discuss-phase used — context would have been useful for HMAC test approach decisions
- Plan checker flagged zero issues across all 3 phases — may indicate plans were conservative

### Patterns Established
- `vi.fn(function() { return {...}; })` for mocking constructable classes (not arrow functions)
- `vi.hoisted()` refs for shared mock factory across tests
- `emitLog` boolean pattern for suppressing logs in local dev without Redis
- Route identifier as last parameter with default for incremental caller migration

### Key Lessons
- Codebase analysis revealed 5 rate-limit callers, not the expected 3 — always verify actual usage
- Research correctly identified that `@upstash/ratelimit` returns `reason: "timeout"` (not exception) — this shaped the entire Phase 1 architecture

### Cost Observations
- Model mix: 100% sonnet (executor/researcher/verifier), inherit for planner
- Sessions: 1 (all 3 phases in single session)
- Notable: Full milestone in ~26 min execution time, single day

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Avg Plan Duration | Issues |
|-----------|--------|-------|-------------------|--------|
| v1.0      | 3      | 4     | ~7 min            | 1 minor (arrow fn mock) |
