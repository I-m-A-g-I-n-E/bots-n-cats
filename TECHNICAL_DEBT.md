# Technical Debt - bots-n-cats

## Priority 1: Microservices Architecture (Before Scale)

### Current State
**Single monolithic server on Railway** - All services (webhook, streaming, dashboard) run in one process on port 3000.

### Why This Is Technical Debt
- **Can't scale independently:** Streaming load affects webhook processing
- **In-memory EventBus:** Only works within single process
- **Resource contention:** SSE connections could impact webhook latency
- **Single point of failure:** One crash takes down everything

### When To Address
**Before reaching ~10-20 concurrent streaming users**

### Solution: Microservices with Redis
```
┌──────────────────┐         ┌─────────────┐         ┌──────────────────┐
│ Webhook Service  │ ──pub─→ │Redis Pub/Sub│ ←─sub── │Streaming Service │
│    (Railway)     │         │  (Railway)  │         │    (Railway)     │
└──────────────────┘         └─────────────┘         └──────────────────┘
```

**Estimated effort:** 4-6 hours
**Cost impact:** Railway Redis free tier sufficient for <1000 users

### Migration Checklist
- [ ] Add Redis service to Railway project
- [ ] Refactor `AudioEventBus` to use Redis pub/sub instead of in-memory
- [ ] Split `integrated-server.ts` into `webhook-service` and `streaming-service`
- [ ] Deploy both services separately on Railway
- [ ] Update DNS/routing if using custom domain
- [ ] Load test with 20+ concurrent streams

---

## Priority 2: Webhook Signature Validation

### Current State
Seeing "Invalid signature" warnings in logs - webhooks from Railway deployment events fail validation.

### Solution
Add whitelist for Railway deployment webhooks or configure GitHub App to only send relevant events.

---

## Priority 3: Production Observability

### Missing
- Error tracking (Sentry)
- Performance monitoring (New Relic, Datadog)
- Structured logging with correlation IDs
- Health check endpoints with proper metrics

### When To Address
After validating product-market fit with first 5-10 users.

---

## Notes
- Current architecture is **perfectly fine** for MVP and handful of early users
- Validated the product works before over-engineering
- Document created: 2025-10-26
# Test webhook music generation - Sun Oct 26 12:39:42 CST 2025
