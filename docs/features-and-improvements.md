# RLaaS: Features, Roadmap & Improvement Tracking

This document serves as the master tracking checklist for all capabilities in **RLaaS (Rate Limiter as a Service)**. It categorizes past/implemented features, upcoming milestones, urgent tasks, suggested improvements, and security considerations.

---

## 1. Past & Implemented Features (`[x] Completed`)

### 1.1. Core Rate Limiting Algorithms
- [x] **Token Bucket Algorithm**: Redis Lua script (`token_bucket.lua`) with atomic capacity, refill rate, and TTL management.
- [x] **Anchored Window Algorithm**: Redis Lua script (`anchored_window.lua`) with fixed window counters.
- [x] **Fail Modes**: `FAIL_OPEN` and `FAIL_CLOSED` execution handling when Redis encounters timeouts or faults.
- [x] **Key Extraction Strategies**: Polymorphic deserialization for `IP`, `USER`, `API_KEY`, `CUSTOM`, and `COMPOSITE` key strategies.
- [x] **Direct Algorithm Testing Endpoint**: `POST /test/rate-limit/check` for real-time validation against Redis.

### 1.2. Security, Authentication & Session Management
- [x] **Spring Security 6 Integration**: Stateless security filter chain, BCrypt password hashing.
- [x] **Redis Session Storage**: Session tokens (`session:<token> -> customerId`) with a strict 4-hour TTL.
- [x] **Dedicated `SecurityController` & `SecurityService`**:
  - `POST /auth/register`: Customer account creation with duplicate checks.
  - `POST /auth/login`: Credential validation and Redis session token generation.
  - `POST /auth/password-otp-generate`: Asynchronous 6-digit numeric OTP generation via `@Async` with 5-minute TTL in Redis.
  - `POST /auth/password-reset`: Secure password update upon valid OTP verification.
  - `POST /auth/logout`: Invalidation and removal of active Redis session.
- [x] **Custom Error Handlers**:
  - `CustomAuthenticationEntryPoint` (401 JSON response).
  - `CustomAccessDeniedHandler` (403 JSON response).
- [x] **CORS Configuration**: Dedicated `CorsConfig.java` allowing standard frontend origins (ports 3000, 5173).

### 1.3. Customer Account & Ownership Protection
- [x] **Customer Profile Retrieval**:
  - `GET /customers/me`: Direct retrieval of authenticated customer profile from session.
  - `GET /customers/{id}`: Customer profile lookup with cross-tenant isolation (user A cannot access user B).
- [x] **Customer Profile Management**: `PUT /customers/{id}` (name/email update) and `DELETE /customers/{id}` (soft-delete to `TERMINATED`).

### 1.4. Project Management
- [x] **Project CRUD**:
  - `POST /projects`: Create customer-scoped project.
  - `GET /projects`: List all projects for customer with policy counts.
  - `GET /projects/{projectId}`: Fetch single project (ownership validated).
  - `PUT /projects/{projectId}`: Update project name and status (`ACTIVE`, `INACTIVE`, `TERMINATED`).
  - `DELETE /projects/{projectId}`: Soft-delete project.
- [x] **Tenant Scoping & Uniqueness**: `findByIdAndCustomerId` and name uniqueness per customer.

### 1.5. Rate Limit Policy Management
- [x] **Policy CRUD**:
  - `POST /projects/{projectId}/policies`: Create policy attached to customer's project.
  - `GET /projects/{projectId}/policies`: List policies in project.
  - `GET /policies?policyId={id}`: Direct-ID lookup via query parameter (ownership validated).
  - `PUT /policies?policyId={id}`: Full update of policy configuration.
  - `PATCH /policies/status?policyId={id}&status={status}`: Status toggle (`ACTIVE`, `INACTIVE`).
  - `DELETE /policies?policyId={id}`: Soft-delete policy (`TERMINATED`).
- [x] **Strict Configuration Validation**: Type enforcement validating that `algorithmConfig` matches `algorithmType` (TokenBucket vs AnchoredWindow).
- [x] **Direct-ID Query Parameter Architecture**: Implemented `policyId` query param access pattern.

### 1.6. Infrastructure & Operations
- [x] **Docker Compose Setup**: Ephemeral PostgreSQL 16, Redis 7-Alpine, and containerized Spring Boot backend (`rlaas-network`).
- [x] **Actuator Health Endpoint**: `GET /actuator/health` monitoring PostgreSQL, Redis, Mail, and disk space.
- [x] **Documentation**: Complete ready-to-run [api-curl-requests.md](file:///home/rarestpreet/Projects/projects/RLaaS/docs/api-curl-requests.md) reference.

### 1.7. API Key Management
- [x] **Customer-Scoped API Keys**:
  - `POST /api-keys`: Create API key (generates `rlaas_<prefix>_<secretEntropy>`, stores SHA-256 hash, returns raw key once).
  - `GET /api-keys`: List all API keys for customer (shows ID, name, usage, status, expiresAt, timestamps).
  - `GET /api-keys/{id}`: Get API key details.
  - `PATCH /api-keys/{id}/status?status={status}`: Toggle key status (`ACTIVE` / `INACTIVE`).
  - `DELETE /api-keys/{id}`: Revoke key (`TERMINATED`).
  - *Constraint*: Keys are immutable once created (cannot be renamed or edited, only status changed or revoked).
- [x] **Key Validation Engine**: `validateApiKey(rawKey)` method ready for runtime gateway with SHA-256 hash verification, active status check, and usage counter increment.

### 1.8. Rate Limiting Gateway Decision Engine
- [x] **Runtime Decision Gateway (`POST /v1/check`)**:
  - Authenticates client microservices and proxies via `X-API-Key: rlaas_...` header.
  - Automatically resolves customer's active `Policy` matching the requested endpoint (with optional `projectId` disambiguation).
  - Polymorphically extracts the rate-limiting target key using configured `KeyStrategy` (`IP`, `USER`, `API_KEY`, `CUSTOM`, `COMPOSITE`).
  - Executes atomic Redis Lua scripts (`TokenBucketAlgorithm` or `AnchoredWindowAlgorithm`).
  - Returns standard RFC 6585 headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
  - Employs resilient `failMode` fallback (`FAIL_OPEN` degraded allow vs `FAIL_CLOSED` deny) if Redis connection fails.

---

## 2. Urgent Features (`[ ] Next Priority`)

- [ ] **Circuit Breaker & Redis Health Monitoring**:
  - Automatic fallback branching based on policy `failMode` (`FAIL_OPEN` vs `FAIL_CLOSED`) when Redis latency spikes or connection fails.
- [ ] **Redis Policy Cache Warmup**:
  - Cache policy configs in Redis (`policy:<id>` or `policy:<projectId>:<endpoint>`) to achieve zero database queries on the rate-limiting hot path.


## 3. Upcoming Features

- [ ] **Circuit Breaker & Redis Health Monitoring**:
  - Automatic fallback branching based on policy `failMode` (`FAIL_OPEN` vs `FAIL_CLOSED`) when Redis latency spikes or connection fails.
- [ ] **Key Quotas per Customer**:
  - Hard limits on the number of active API keys per customer (e.g., maximum 5 active keys).
- [ ] **Project / Policy Cascading Lifecycle**:
  - Automatically cascade project deactivation or termination down to all its associated rate limit policies and Redis cache keys.
- [ ] **Redis Policy Cache Warmup**:
  - Cache policy configs in Redis (`policy:<id>` or `policy:<projectId>:<endpoint>`) to achieve zero database queries on the rate-limiting hot path.

---

## 4. Suggested Features & Extensions

- [ ] **Sliding Window Counter Algorithm**:
  - Add Redis Sorted Set (ZSET) sliding log / sliding window counter algorithm as a third policy algorithm option.
- [ ] **Leaky Bucket Algorithm**:
  - Add queue-based leaky bucket algorithm for smooth traffic shaping.
- [ ] **Temporary API Keys with Expiration**:
  - Support optional `expiresAt` instant when creating API keys (e.g., keys valid for 30/90 days).
- [ ] **IP Whitelisting on API Keys**:
  - Restrict usage of specific API keys to a defined list of client CIDR blocks or IP addresses.
- [ ] **Webhook Alerts on Limit Breach**:
  - Option to trigger webhooks when high rate-limit breach thresholds (e.g., >80% rejection rate) occur.

---

## 5. Usage & Analytics Pipeline (Planned for Future Phase)

- [ ] **Async Usage Events Queue**:
  - Decouple rate-limit evaluation from logging by pushing decision telemetry asynchronously to Redis Streams / RabbitMQ.
- [ ] **Usage Aggregations**:
  - Ingestion consumer that aggregates daily and monthly request counts per policy, project, and customer.
- [ ] **Customer Usage Metrics API**:
  - `GET /projects/{id}/analytics`: Request volume, allowed vs rejected ratio, and top client IPs over time.

---

## 6. Improvements Needed & Refactoring

- [ ] **Dynamic Lua Script Caching (`SCRIPT LOAD` / `EVALSHA`)**:
  - Use Redis SHA1 script caching rather than passing full Lua scripts on every invocation to minimize network overhead.
- [ ] **Connection Pooling Optimization**:
  - Tune Lettuce/Jedis connection pool sizes (min/max idle, timeout thresholds) for high-concurrency throughput (~200+ req/sec).
- [ ] **Disposable Email Filter**:
  - Reject disposable email domains during customer registration to mitigate throwaway account churn.
- [ ] **Standardized Pagination**:
  - Add `page` and `size` query params on `GET /projects`, `GET /policies`, and `GET /api-keys` instead of returning full lists.

---

## 7. Security & Hardening Features

- [ ] **One-Way Hashing for API Keys at Rest**:
  - Store only `SHA-256(rawKey)` and the public lookup prefix in the database; never persist raw API keys in plain text.
- [ ] **Rate Limiting on Authentication Endpoints**:
  - Apply brute-force protection to `/auth/login` and `/auth/password-otp-generate` (e.g., max 5 failed attempts per IP / email per hour).
- [ ] **Timing-Attack Safe Comparison**:
  - Use `MessageDigest.isEqual` for comparing hash values and signatures to prevent timing attacks.
- [ ] **Secret Scanner Compatibility**:
  - Maintain the distinct `rlaas_` prefix for detection by tools like GitHub Secret Scanning and GitGuardian.
