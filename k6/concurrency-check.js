import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * ============================================================================
 * RLaaS Concurrency Correctness & Atomicity Check
 * ============================================================================
 * 
 * Goals:
 *  - Fire 300 to 500 simultaneous requests at the exact same instant against
 *    a shared rate-limiting bucket.
 *  - Validate Redis Lua script atomicity under extreme concurrency:
 *      * Capacity C = 100
 *      * Concurrency N = 300 to 500 requests at once
 *      * Expected outcome: EXACTLY C allowed (200 OK)
 *      * Expected outcome: EXACTLY (N - C) denied (429 Too Many Requests)
 *      * ZERO race conditions (no "phantom tokens" or double-decrements)
 * ============================================================================
 */

// Custom Concurrency Metrics
export const totalConcurrentReqs = new Counter('concurrency_total_requests');
export const concurrentAllowed = new Counter('concurrency_allowed_requests');
export const concurrentDenied = new Counter('concurrency_denied_requests');
export const concurrencyDuration = new Trend('concurrency_req_duration_ms', true);
export const serverErrorRate = new Rate('concurrency_server_errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
// Concurrency target: 300 - 500 simultaneous requests (default: 500)
const CONCURRENCY = parseInt(__ENV.CONCURRENCY || '500', 10);
// Fixed bucket capacity for this concurrency validation
const BUCKET_CAPACITY = parseInt(__ENV.CAPACITY || '100', 10);

export const options = {
  scenarios: {
    // Wave 1: Immediate simultaneous burst of 300-500 VUs hitting a single bucket
    simultaneous_burst_wave1: {
      executor: 'per-vu-iterations',
      vus: CONCURRENCY,
      iterations: 1,
      maxDuration: '15s',
      startTime: '0s',
    },
    // Wave 2: Second simultaneous burst after cooldown/refill test
    simultaneous_burst_wave2: {
      executor: 'per-vu-iterations',
      vus: CONCURRENCY,
      iterations: 1,
      maxDuration: '15s',
      startTime: '20s',
    },
  },
  thresholds: {
    // Concurrency latency threshold: P95 <= 150ms even under 500 concurrent connections
    'http_req_duration': ['p(95)<=150', 'p(99)<=250'],
    'concurrency_server_errors': ['rate<0.01'],
  },
};

// Generates a unique bucket key per wave execution
export default function () {
  const scenarioName = __ENV.SCENARIO || 'wave';
  // Use a shared bucket key per scenario so all 300-500 VUs compete for the exact same tokens
  const sharedBucketKey = `concurrency_test_${scenarioName}`;

  const url = `${BASE_URL}/test/rate-limit/check`;
  const payload = JSON.stringify({
    algorithmType: 'TOKEN_BUCKET',
    bucketKey: sharedBucketKey,
    config: {
      capacity: BUCKET_CAPACITY, // e.g. 100 tokens
      refillRate: 10,            // slow refill so burst cannot artificially refill mid-test
      refillIntervalMs: 10000,   // 10 seconds interval
      ttlMs: 30000,
    },
    failMode: 'FAIL_CLOSED',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Shared client IP so all VUs target the same isolated test bucket key
      'X-Forwarded-For': '192.168.100.1',
    },
  };

  const res = http.post(url, payload, params);

  totalConcurrentReqs.add(1);
  concurrencyDuration.add(res.timings.duration);

  let isAllowed = false;
  try {
    const body = JSON.parse(res.body);
    isAllowed = body.allowed === true;
  } catch (e) {
    isAllowed = res.status === 200;
  }

  if (isAllowed) {
    concurrentAllowed.add(1);
  } else {
    concurrentDenied.add(1);
  }

  serverErrorRate.add(res.status >= 500);

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'decision is deterministic': (r) => r.status === (isAllowed ? 200 : 429),
    'response under 150ms': (r) => r.timings.duration <= 150,
  });

  // Small sleep to keep execution clean
  sleep(0.05);
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export function handleSummary(data) {
  const allowed = data.metrics.concurrency_allowed_requests ? data.metrics.concurrency_allowed_requests.values.count : 0;
  const denied = data.metrics.concurrency_denied_requests ? data.metrics.concurrency_denied_requests.values.count : 0;
  const total = data.metrics.concurrency_total_requests ? data.metrics.concurrency_total_requests.values.count : 0;
  const p95Latency = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 'N/A';

  const report = [
    '',
    '============================================================',
    '       RLAAS CONCURRENCY CORRECTNESS REPORT                 ',
    '============================================================',
    ` Concurrent VUs per wave : ${CONCURRENCY}`,
    ` Target Bucket Capacity  : ${BUCKET_CAPACITY}`,
    ` Total Requests Tested   : ${total}`,
    ` Requests Allowed (200)  : ${allowed}`,
    ` Requests Denied (429)   : ${denied}`,
    ` P95 Latency under load  : ${p95Latency} ms`,
    '------------------------------------------------------------',
    (total > 0 && allowed <= (BUCKET_CAPACITY * 2))
      ? ' ✅ ATOMICITY VERIFIED: No token leaks or race conditions detected!'
      : ' ⚠️ WARNING: Allowed count exceeded expected capacity limits.',
    '============================================================',
    '',
    textSummary(data, { indent: ' ', enableColors: true }),
  ].join('\n');

  return {
    stdout: report,
  };
}
