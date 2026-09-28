import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * ============================================================================
 * RLaaS 5,000 req/sec High-Throughput Load Test
 * ============================================================================
 * 
 * Goals:
 *  - Target throughput: 5,000 req/sec (5k RPS)
 *  - Latency: P95 <= 100-150ms per request (threshold enforced)
 *  - Failure rate: < 1%
 *
 * Architecture Notes:
 *  - Uses k6 'ramping-arrival-rate' executor to guarantee constant iteration
 *    rate independent of response latency.
 *  - Little's Law: At 5,000 req/s with 150ms latency -> 750 concurrent in-flight
 *    requests. preAllocatedVUs=600 and maxVUs=1500 are provisioned.
 * ============================================================================
 */

// Custom Metrics
export const allowedCounter = new Counter('rlaas_allowed_requests');
export const deniedCounter = new Counter('rlaas_denied_requests');
export const decisionLatency = new Trend('rlaas_decision_duration_ms', true);
export const serverErrorRate = new Rate('rlaas_server_errors');

// Environment Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '5000', 10);
const TEST_ENDPOINT = __ENV.TEST_ENDPOINT || '/test/rate-limit/check'; // Default to fast unauthenticated test controller
const API_KEY = __ENV.API_KEY || ''; // Optional: set if targeting /v1/check

export const options = {
  scenarios: {
    sustained_5k_rps: {
      executor: 'ramping-arrival-rate',
      startRate: 500,
      timeUnit: '1s',
      preAllocatedVUs: 600,
      maxVUs: 1500,
      stages: [
        { target: 1000, duration: '15s' }, // Warmup to 1,000 RPS
        { target: 3000, duration: '20s' }, // Scale to 3,000 RPS
        { target: TARGET_RPS, duration: '30s' }, // Scale to 5,000 RPS
        { target: TARGET_RPS, duration: '60s' }, // Steady-state sustained 5k RPS
        { target: 1000, duration: '15s' }, // Scale down
        { target: 0,    duration: '10s' }, // Cool down
      ],
    },
  },
  thresholds: {
    // Primary User Target: P95 <= 150ms (and P90 <= 100ms)
    'http_req_duration': [
      'p(90)<=100', // 90% of requests must complete within 100ms
      'p(95)<=150', // 95% of requests must complete within 150ms
      'p(99)<=250', // 99% tail latency under 250ms
    ],
    // Zero unhandled 5xx server errors
    'http_req_failed': ['rate<0.01'],
    'rlaas_server_errors': ['rate<0.005'],
  },
};

export default function () {
  // Rotate across 100 distinct client IPs to simulate realistic distributed traffic
  const clientIp = `10.0.${Math.floor(__VU / 256)}.${__VU % 256}`;
  const keyIndex = Math.floor(Math.random() * 50);

  let res;

  if (TEST_ENDPOINT.startsWith('/v1/check')) {
    // Production Gateway endpoint
    const url = `${BASE_URL}/v1/check`;
    const payload = JSON.stringify({
      endpoint: '/api/v1/bench',
      clientIp: clientIp,
      userId: `user_${keyIndex}`,
    });
    res = http.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || 'rlaas_bench_key',
      },
    });
  } else {
    // Direct RateLimiterTestController endpoint (pre-configured with high test limits)
    const url = `${BASE_URL}/test/rate-limit/check`;
    const payload = JSON.stringify({
      algorithmType: 'TOKEN_BUCKET',
      bucketKey: `loadtest_${keyIndex}`,
      config: {
        capacity: 50000,         // High test capacity
        refillRate: 10000,       // Rapid refill for 5k RPS
        refillIntervalMs: 50,    // 50ms interval
        ttlMs: 60000,
      },
      failMode: 'FAIL_OPEN',
    });
    res = http.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': clientIp,
      },
    });
  }

  // Record custom telemetry
  decisionLatency.add(res.timings.duration);

  const isSuccess = res.status === 200;
  const isThrottled = res.status === 429;
  const is5xx = res.status >= 500;

  if (isSuccess) allowedCounter.add(1);
  if (isThrottled) deniedCounter.add(1);
  serverErrorRate.add(is5xx);

  check(res, {
    'HTTP status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'Response duration within 150ms': (r) => r.timings.duration <= 150,
  });
}
