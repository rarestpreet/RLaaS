# RLaaS API Reference & cURL Collection

This document provides a single, ready-to-run `curl` request for every endpoint available in **RLaaS** (Rate Limiter as a Service), organized by resource controller.

---

## Quick Setup: Environment Variables

Set the common variables in your shell before executing the requests:

```bash
BASE_URL="http://localhost:8080"
TOKEN="fb4a1ee9-9e5d-480a-aa8d-825383797572"
CUSTOMER_ID="b20edafe-3219-4e92-b18a-fbdc2d9b3833"
PROJECT_ID="<YOUR_PROJECT_ID>"
POLICY_ID="<YOUR_POLICY_ID>"
```

---

## 1. Security & Authentication APIs (`/auth` via `SecurityController`)

### 1.1. Account Registration
Registers a new customer account.
```bash
curl -i -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "password": "SecurePassword123!"
  }'
```

### 1.2. Account Login
Authenticates customer and returns a 4-hour session token.
```bash
curl -i -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "janedoe@example.com",
    "password": "SecurePassword123!"
  }'
```

### 1.3. Generate Password Reset OTP
Dispatches a 6-digit OTP asynchronously to the customer's email (valid for 5 minutes).
```bash
curl -i -X POST "$BASE_URL/auth/password-otp-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "janedoe@example.com"
  }'
```

### 1.4. Reset Password with OTP
Validates the OTP and updates the account password.
```bash
curl -i -X POST "$BASE_URL/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "janedoe@example.com",
    "otp": "123456",
    "newPassword": "NewSecurePassword456!"
  }'
```

### 1.5. Customer Logout
Invalidates the current session token in Redis.
```bash
curl -i -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. Customer Profile APIs (`/customers` via `CustomerController`)

All customer profile operations require an active session token and enforce multi-tenant isolation.

### 2.1. Fetch Current Customer Account Profile (`/customers/me`)
Retrieves profile data of the currently authenticated customer directly from the session.
```bash
curl -i -X GET "$BASE_URL/customers/me" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.2. Fetch Customer Account Profile by ID (`/customers/{id}`)
Retrieves profile data by customer ID (strictly validates that user A cannot access user B's account).
```bash
curl -i -X GET "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.3. Update Customer Profile
Updates name or email for the authenticated customer account.
```bash
curl -i -X PUT "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "janedoe@example.com"
  }'
```

### 2.4. Terminate Customer Account (Soft Delete)
Marks the customer account status as `TERMINATED`.
```bash
curl -i -X DELETE "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Project Management APIs (`/projects` via `ProjectController`)

All project endpoints require authentication and are scoped strictly to the authenticated customer.

### 3.1. Create Project
Creates a new project for the authenticated customer.
```bash
curl -i -X POST "$BASE_URL/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Gateway Service"
  }'
```

### 3.2. List Customer Projects
Retrieves all projects owned by the authenticated customer with policy counts.
```bash
curl -i -X GET "$BASE_URL/projects" \
  -H "Authorization: Bearer $TOKEN"
```

### 3.3. Get Project Details by ID
Fetches a single project by ID (validates customer ownership).
```bash
curl -i -X GET "$BASE_URL/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 3.4. Update Project (Name & Status)
Updates project name and status (`ACTIVE`, `INACTIVE`, `TERMINATED`).
```bash
curl -i -X PUT "$BASE_URL/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Gateway Service V2",
    "status": "ACTIVE"
  }'
```

### 3.5. Soft-Delete Project
Soft-deletes a project by setting its status to `TERMINATED`.
```bash
curl -i -X DELETE "$BASE_URL/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Rate Limit Policy Management APIs (`/policies` via `PolicyController`)

### 4.1. Create Rate Limit Policy (Token Bucket)
Attaches a new rate limiting policy to a project using the Token Bucket algorithm.
```bash
curl -i -X POST "$BASE_URL/projects/$PROJECT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Checkout Rate Limit",
    "endpoint": "/api/v1/payments/checkout",
    "algorithmType": "TOKEN_BUCKET",
    "algorithmConfig": {
      "capacity": 20,
      "refillRate": 5,
      "refillIntervalMs": 1000,
      "ttlMs": 60000
    },
    "keyStrategy": {
      "type": "IP"
    },
    "failMode": "FAIL_OPEN"
  }'
```

### 4.2. Create Rate Limit Policy (Anchored Window)
Attaches an Anchored Window policy to a project.
```bash
curl -i -X POST "$BASE_URL/projects/$PROJECT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Search Rate Limit",
    "endpoint": "/api/v1/search",
    "algorithmType": "ANCHORED_WINDOW",
    "algorithmConfig": {
      "limit": 100,
      "windowMs": 60000
    },
    "keyStrategy": {
      "type": "USER"
    },
    "failMode": "FAIL_CLOSED"
  }'
```

### 4.3. List All Policies by Project
Retrieves all rate limiting policies belonging to a specific project.
```bash
curl -i -X GET "$BASE_URL/projects/$PROJECT_ID/policies" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.4. Get Policy by Direct ID (Query Parameter)
Fetches a single policy by `policyId` query parameter with customer ownership validation.
```bash
curl -i -X GET "$BASE_URL/policies?policyId=$POLICY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.5. Update Policy Configuration (Query Parameter)
Performs a full update on an existing policy using query parameter.
```bash
curl -i -X PUT "$BASE_URL/policies?policyId=$POLICY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Checkout Limit",
    "endpoint": "/api/v1/payments/checkout",
    "algorithmType": "TOKEN_BUCKET",
    "algorithmConfig": {
      "capacity": 50,
      "refillRate": 10,
      "refillIntervalMs": 1000,
      "ttlMs": 60000
    },
    "keyStrategy": {
      "type": "IP"
    },
    "failMode": "FAIL_CLOSED",
    "status": "ACTIVE"
  }'
```

### 4.6. Toggle Policy Status (Query Parameter)
Toggles policy status (`ACTIVE`, `INACTIVE`) using query parameter.
```bash
curl -i -X PATCH "$BASE_URL/policies/status?policyId=$POLICY_ID&status=INACTIVE" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.7. Soft-Delete Policy (Query Parameter)
Soft-deletes a policy (`TERMINATED`) using query parameter.
```bash
curl -i -X DELETE "$BASE_URL/policies?policyId=$POLICY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. API Key Management APIs (`/api-keys` via `ApiKeyController`)

All API key endpoints require authentication via Bearer token and are scoped to the authenticated customer.

### 5.1. Create API Key
Creates a new API key. The full `rawKey` is returned **only once** in this response.
```bash
curl -i -X POST "$BASE_URL/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Backend Gateway",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```
> **Tip**: Save the returned `rawKey` securely in your client, and save the key `id` from the list endpoint:
> ```bash
> API_KEY_ID="<COPIED_KEY_ID>"
> ```

### 5.2. List Customer API Keys
Lists all API keys belonging to the authenticated customer (displays `id`, `name`, `usage`, `status`, `expiresAt`, `createdAt`).
```bash
curl -i -X GET "$BASE_URL/api-keys" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.3. Get API Key by ID
Fetches details of a specific API key (validates customer ownership).
```bash
curl -i -X GET "$BASE_URL/api-keys/$API_KEY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.4. Toggle API Key Status (Activate / Deactivate)
Enables or disables an API key without revoking it.
```bash
# Deactivate
curl -i -X PATCH "$BASE_URL/api-keys/$API_KEY_ID/status?status=INACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# Re-activate
curl -i -X PATCH "$BASE_URL/api-keys/$API_KEY_ID/status?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.5. Revoke API Key (Soft Delete)
Permanently revokes an API key by setting its status to `TERMINATED`.
```bash
curl -i -X DELETE "$BASE_URL/api-keys/$API_KEY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Rate Limiting Gateway Decision APIs (`/v1/check` via `RateLimitGatewayController`)

The runtime gateway endpoint used by client microservices, proxies (Kong/Envoy/Nginx), and SDKs.
Authenticated via `X-API-Key` header instead of user session tokens.

### 6.1. Check Rate Limit (IP-Based Strategy)
Evaluates rate limit for a client IP.
```bash
curl -i -X POST "$BASE_URL/v1/check" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/v1/payments/checkout",
    "clientIp": "203.0.113.42"
  }'
```

### 6.2. Check Rate Limit with Explicit Project ID
Disambiguates when multiple customer projects define the same endpoint path.
```bash
curl -i -X POST "$BASE_URL/v1/check" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'"$PROJECT_ID"'",
    "endpoint": "/api/v1/payments/checkout",
    "clientIp": "203.0.113.42"
  }'
```

### 6.3. Check Rate Limit (User-Based Strategy)
Evaluates rate limit for an authenticated user ID with custom device headers.
```bash
curl -i -X POST "$BASE_URL/v1/check" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/v1/search",
    "userId": "usr_alpha_9812",
    "clientIp": "198.51.100.25",
    "customHeaders": {
      "X-Device-Id": "ios-device-xyz"
    }
  }'
```

---

## 7. Direct Algorithm Test & Health APIs

### 7.1. Direct Algorithm Test Endpoint
Directly tests algorithm evaluation against Redis for an arbitrary bucket key without needing policies.
```bash
curl -i -X POST "$BASE_URL/test/rate-limit/check" \
  -H "Content-Type: application/json" \
  -d '{
    "bucketKey": "rate:limit:test:user_123",
    "algorithmType": "TOKEN_BUCKET",
    "config": {
      "capacity": 5,
      "refillRate": 1,
      "refillIntervalMs": 1000,
      "ttlMs": 60000
    }
  }'
```

### 7.2. Actuator Health Check
Checks service health including PostgreSQL, Redis, and Mail.
```bash
curl -i -X GET "$BASE_URL/actuator/health"
```

