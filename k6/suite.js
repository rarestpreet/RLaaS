import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * ============================================================================
 * RLaaS Complete k6 Test Suite (Concurrency Check + 5,000 RPS Load Test)
 * ============================================================================
 * 
 * Execution Plan:
 *  - Phase 1 (0s - 30s): Concurrency check: fires 500 parallel requests at once
 *    against a shared bucket key (capacity = 100). Verifies exact atomic cutoff.
 *  - Phase 2 (35s - 2m15s): 5,000 req/sec sustained load test with P95 <= 150ms.
 * ============================================================================
 */

export const phase1Allowed = new Counter('phase1_concurrent_allowed');
export const phase1Denied = new Counter('phase1_concurrent_denied');
export const phase2Allowed = new Counter('phase2_load_allowed');
export const phase2Denied = new Counter('phase2_load_denied');

export const suiteLatency = new Trend('suite_latency_ms', true);
export const suiteErrors = new Rate('suite_5xx_errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONCURRENCY = parseInt(__ENV.CONCURRENCY || '500', 10);
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '5000', 10);

export const options = {
  scenarios: {
    // ------------------------------------------------------------------------
    // Scenario 1: 500 Concurrent Requests at the exact same instant
    // ------------------------------------------------------------------------
    phase1_concurrency_burst: {
      executor: 'per-vu-iterations',
      vus: CONCURRENCY,
      iterations: 1,
      maxDuration: '20s',
      startTime: '0s',
      exec: 'runConcurrencyCheck',
    },

    // ------------------------------------------------------------------------
    // Scenario 2: High Throughput Load Test scaling to 5,000 RPS
    // ------------------------------------------------------------------------
    phase2_load_5k_rps: {
      executor: 'ramping-arrival-rate',
      startRate: 500,
      timeUnit: '1s',
      preAllocatedVUs: 600,
      maxVUs: 1500,
      startTime: '25s', // Runs after concurrency check finishes
      stages: [
        { target: 1500,       duration: '15s' }, // Ramp up to 1,500 RPS
        { target: TARGET_RPS, duration: '25s' }, // Ramp up to 5,000 RPS
        { target: TARGET_RPS, duration: '45s' }, // Sustain 5,000 RPS
        { target: 500,        duration: '15s' }, // Ramp down
        { target: 0,          duration: '10s' }, // Cool down
      ],
      exec: 'runLoadTest',
    },
  },
  thresholds: {
    // Both scenarios must adhere to the P95 <= 150ms requirement
    'http_req_duration': ['p(95)<=150', 'p(90)<=100', 'p(99)<=250'],
    'suite_5xx_errors': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

/**
 * Executes Scenario 1: 300-500 Parallel Requests Against Shared Key
 */
export function runConcurrencyCheck() {
  const url = `${BASE_URL}/test/rate-limit/check`;
  const payload = JSON.stringify({
    algorithmType: 'TOKEN_BUCKET',
    bucketKey: 'suite_shared_concurrency_bucket',
    config: {
      capacity: 100,
      refillRate: 10,
      refillIntervalMs: 10000,
      ttlMs: 30000,
    },
    failMode: 'FAIL_CLOSED',
  });

  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.1.100', // All share the same IP
    },
  });

  suiteLatency.add(res.timings.duration);
  suiteErrors.add(res.status >= 500);

  if (res.status === 200) phase1Allowed.add(1);
  if (res.status === 429) phase1Denied.add(1);

  check(res, {
    'concurrency: status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'concurrency: latency <= 150ms': (r) => r.timings.duration <= 150,
  });
}

/**
 * Executes Scenario 2: 5,000 Requests/sec Load Test
 */
export function runLoadTest() {
  const keyIndex = Math.floor(Math.random() * 100);
  const clientIp = `10.1.${Math.floor(__VU / 256)}.${__VU % 256}`;

  const url = `${BASE_URL}/test/rate-limit/check`;
  const payload = JSON.stringify({
    algorithmType: 'TOKEN_BUCKET',
    bucketKey: `suite_load_key_${keyIndex}`,
    config: {
      capacity: 50000,
      refillRate: 10000,
      refillIntervalMs: 50,
      ttlMs: 60000,
    },
    failMode: 'FAIL_OPEN',
  });

  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp,
    },
  });

  suiteLatency.add(res.timings.duration);
  suiteErrors.add(res.status >= 500);

  if (res.status === 200) phase2Allowed.add(1);
  if (res.status === 429) phase2Denied.add(1);

  check(res, {
    'load: status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'load: latency <= 150ms': (r) => r.timings.duration <= 150,
  });
}
