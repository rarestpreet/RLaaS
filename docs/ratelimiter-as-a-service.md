# RateLimiter as a Service

## What is this?

A multi-tenant SaaS platform that lets developers offload rate limiting
from their own applications. Instead of every team hand-rolling their
own limiter (which is easy to get wrong under concurrency and hard to
keep consistent across services), customers register, define projects
and policies, and call a single API to get an `ALLOW` / `DENY` /
`REJECT` decision for any request — with correctness guaranteed across
distributed instances.

Core idea: **centralize the decision, not the enforcement.** The
customer's application still decides what to do with the decision
(reject the HTTP call, queue it, degrade gracefully) — this service
just tells them, correctly and fast, whether the request is within
limits.

---

## Why build this instead of using a library?

- **Correctness under concurrency/distribution is the hard part.**
  Hand-rolled limiters usually race under load (check-then-increment
  isn't atomic) or aren't safe across multiple app instances. This
  service solves that with Lua-scripted atomic Redis operations.
- **Multi-strategy keying without redeploying.** Switch or compose
  key strategies (user, IP, API key, custom, composite) via config,
  not code changes.
- **Cross-cutting across services.** One policy engine instead of
  every microservice reinventing limiting differently.
- **Configurable failure semantics.** Fail-open vs fail-closed is a
  first-class per-policy decision, not an afterthought.
- **Operational visibility.** Usage stats and allow/deny rates turn
  this into a product, not just a mechanism.

Honest caveat: libraries like Bucket4j/Resilience4j are legitimate
alternatives for a single service. This project's value is being a
**centralized, multi-tenant control plane** — useful when consistency
across many services/teams matters, not when one service needs basic
limiting.

---

## High-Level Architecture

```
Client App → API Gateway → Auth Filter → Decision Controller
                                              │
                                    Policy Resolver (cache → Postgres)
                                              │
                                      Key Resolver (keyStrategy)
                                              │
                                    Redis Circuit Breaker
                                    ┌─────────┴─────────┐
                              CLOSED (healthy)      OPEN (down)
                                    │                    │
                            Algorithm Engine      failMode check
                          (Token Bucket /       FAIL_CLOSED → deny
                           Anchored Window)      FAIL_OPEN → local
                                    │            best-effort counter
                                  Redis
                                    │
                              Decision → Client

                    (async, non-blocking: usage/analytics/notifications
                     pushed to a queue, never on the hot path)
```

A background **Scheduler** continuously pings Redis health and flips
the circuit breaker state (CLOSED / OPEN / HALF_OPEN) — failure
detection is decoupled from the request path.

---

## Core Modules

### 1. Account & Access Management
- Customer registration, login, profile update/termination
- API key generation, listing (non-secret info only), revocation
- API keys are customer-level credentials (not tied to a project)

### 2. Project & Policy Management
- Customers create multiple isolated projects
- Each project supports multiple policies (one per API/endpoint)
- A policy defines: algorithm type, algorithm config, key strategy,
  fail mode, status

### 3. Rate-Limit Decision Engine
- Single endpoint: `POST /v1/check` — authenticate, resolve policy,
  resolve key, evaluate algorithm, return decision
- Returns `ALLOW` / `DENY` / `REJECT` with remaining allowance and
  retry-after info
- Caller app decides what to do with the decision — this service
  never blocks or intercepts the actual request

### 4. Algorithms
- **Token Bucket** — `capacity`, `refillRate`, `refillIntervalMs`.
  Allows short bursts up to capacity, then throttles to a sustained
  rate as tokens refill continuously. Best fit for general APIs.
- **Anchored Window** — `limit`, `windowMs`. Fixed count per window,
  anchored to first request rather than a clock boundary (avoids
  edge-of-window burst problems). Best fit for strict, security-
  sensitive flows (OTP generation/validation).
- Both implemented as atomic Lua scripts executed in Redis — read,
  compute, write happen in a single round trip, so concurrent
  requests for the same key never race.

### 5. Key Strategies
- Pluggable, JSON-configured, polymorphic (`Jackson @JsonTypeInfo`)
- `UserKeyStrategy`, `IpKeyStrategy`, `ApiKeyStrategy`,
  `CustomKeyStrategy` (customer-defined field), `CompositeKeyStrategy`
  (combines multiple strategies into one key)
- Lets the same policy engine support very different grouping needs
  without new code per case

### 6. Resilience / Failure Handling
- Circuit breaker in front of Redis, health-checked by a scheduler
- Per-policy `failMode`: `FAIL_CLOSED` (deny when Redis is down —
  safer for sensitive flows) or `FAIL_OPEN` (best-effort local
  in-memory counter per instance — approximate, discarded on
  recovery, never merged back into Redis to avoid double-counting)

### 7. Usage & Analytics (planned, not yet built)
- Async, queue-based (Kafka/RabbitMQ) — never on the decision hot path
- Tracks allowed/denied request counts per policy
- Future: traffic-surge alerts, usage dashboards

### 8. Subscription / Plans (future)
- Multiple plans with different limits/capabilities
- Policy configuration validated against the customer's active plan
- Expired-subscription fallback behavior (deny vs. downgrade to free
  tier), with notification on fallback

---

## Data Model (summary)

| Entity   | Key fields                                                        |
|----------|--------------------------------------------------------------------|
| Customer | id, name, email, password, status                                  |
| Project  | id, customerId, name, status                                       |
| Policy   | id, projectId, name, endpoint, algorithmType, algorithmConfig (JSONB), keyStrategy (JSONB), failMode, status |
| ApiKey   | id, customerId, prefix, keyHash, usage, status, lastUsedAt          |
| Bucket   | Redis only — key = `policyId + algorithmType + resolvedKey`, JSONB state, TTL |

`algorithmConfig` and `keyStrategy` are both JSONB, deserialized
polymorphically into typed Java classes — flexible storage, type-safe
code.

---

## Build Order (suggested)

1. **Entities** — Customer, Project, Policy (merged with limiter
   config), ApiKey
2. **Key strategy classes** — the 5 `KeyStrategyConfig` implementations
3. **Repositories** — one per entity, Spring Data JPA
4. **Redis config** — connection factory, RedisTemplate, wired into
   `pom.xml`
5. **Algorithm engine (structure first)** — abstract `Algorithm` class,
   `TokenBucketAlgorithm` / `AnchoredWindowAlgorithm` stubs, actual
   Lua scripts added last once wiring is verified
6. **Account APIs** — register, login, OTP-based password reset,
   update, delete + email service for OTP delivery
7. **Test controller** — bypasses full policy resolution, exercises
   algorithms directly against Redis to verify wiring before Lua
   logic is real (remove/gate before production)
8. **Decision endpoint** (`POST /v1/check`) — wires everything above
   together: auth → policy resolve → key resolve → circuit breaker →
   algorithm → decision
9. **Circuit breaker + scheduler** — Redis health monitoring, failMode
   branching
10. **Usage/analytics pipeline** — async queue consumer (once core
    path is stable)

---

## Performance & Correctness Targets

- ~200 rate-limit decisions/sec initial target, measured via P50/P95/P99
- No DB access on the decision hot path except on cache miss
- Atomic Redis operations — concurrent requests for the same key must
  never exceed the configured limit
- Correct behavior across multiple service instances (no per-instance
  drift under normal operation)
- Non-critical work (logging, notifications, analytics) never adds
  latency to the decision path

---

## Open / Future Decisions

- Usage/analytics storage choice (dedicated analytics DB vs. reusing
  Postgres)
- Concurrency limits and distributed locks (explicitly out of scope
  for v1, kept as a separate future capability from rate limiting)
- Multi-region deployment strategy
