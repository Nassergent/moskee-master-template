# Milestones

## v1.0 Security Hardening (Shipped: 2026-02-28)

**Phases completed:** 3 phases, 4 plans
**Timeline:** 2026-02-28 (single day)
**Files changed:** 26 (+3,578 / -138)

**Key accomplishments:**
- Typed per-route fail strategy for rate limiting — donate hard-fails (503), non-financial routes degrade gracefully to in-memory
- Bounded LRU cache (max 500, 60s TTL) replacing unbounded Map — eliminates memory leak risk
- Structured JSON logging on every fallback/hard-fail path with GDPR-compliant hashed IPs
- Webhook idempotency test suite: Redis timeout (fake timers), ECONNREFUSED, duplicate delivery
- HMAC tampered signature verification tests (pure crypto.subtle, no mocks)
- Shared vi.mock factory pattern with vi.hoisted refs for cross-test mock control

---

