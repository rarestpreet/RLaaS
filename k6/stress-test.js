import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

/**
 * ============================================================================
 * RLaaS Progressive Stress Test (Finding System Breaking Point)
 * ============================================================================
 * 
 * Objective:
 *  - Progressively escalate load from 3,000 RPS up to 25,000 RPS to discover
 *    the service's physical throughput ceiling and latency breaking point.
 *  - Test automatic recovery: observe whether the service immediately recovers
 *    to sub-2ms latency when load drops back down after extreme stress.
 * 
 * Stages:
 *  1. Warmup:     3,000 RPS  (15s)
 *  2. Tier 1:     6,000 RPS  (20s)
 *  3. Tier 2:    10,000 RPS  (20s)
 *  4. Tier 3:    15,000 RPS  (20s)
 *  5. Tier 4:    20,000 RPS  (20s)
 *  6. Peak:      25,000 RPS  (20s)  <-- Hunting for breaking point
 *  7. Recovery:   2,000 RPS  (20s)  <-- Measuring auto-recovery
 *  8. Cooldown:       0 RPS  (10s)
 * ============================================================================
 */

export const allowedReqs = new Counter('stress_allowed_requests');
export const deniedReqs = new Counter('stress_denied_requests');
export const stressErrors = new Rate('stress_server_errors');
export const stressLatency = new Trend('stress_latency_ms', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const PEAK_RPS = parseInt(__ENV.PEAK_RPS || '25000', 10);

export const options = {
  scenarios: {
    progressive_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1s',
      preAllocatedVUs: 1000,
      maxVUs: 4000,
      stages: [
        { target: 3000,             duration: '15s' }, // Warmup
        { target: 6000,             duration: '20s' }, // Step 1: 6k RPS
        { target: 10000,            duration: '20s' }, // Step 2: 10k RPS
        { target: 15000,            duration: '20s' }, // Step 3: 15k RPS
        { target: 20000,            duration: '20s' }, // Step 4: 20k RPS
        { target: PEAK_RPS,         duration: '20s' }, // Step 5: Peak stress (25k RPS)
        { target: 2000,             duration: '20s' }, // Recovery phase
        { target: 0,                duration: '10s' }, // Cooldown
      ],
    },
  },
  thresholds: {
    // Tolerant stress thresholds: we want the test to complete and report where it degrades
    'http_req_failed': ['rate<0.10'], // Less than 10% connection drop under extreme stress
  },
};

export default function () {
  // Rotate across 200 IPs and 100 bucket keys to simulate large-scale microservice traffic
  const ipOctet = __VU % 250;
  const clientIp = `172.16.${Math.floor(__VU / 250)}.${ipOctet}`;
  const keyIndex = Math.floor(Math.random() * 100);

  const url = `${BASE_URL}/test/rate-limit/check`;
  const payload = JSON.stringify({
    algorithmType: 'TOKEN_BUCKET',
    bucketKey: `stress_${keyIndex}`,
    config: {
      capacity: 500000,       // Large capacity to measure physical raw throughput
      refillRate: 50000,      // Aggressive refill rate
      refillIntervalMs: 20,   // Rapid token replenishment
      ttlMs: 60000,
    },
    failMode: 'FAIL_OPEN',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp,
    },
  };

  const res = http.post(url, payload, params);

  stressLatency.add(res.timings.duration);
  stressErrors.add(res.status >= 500);

  if (res.status === 200) allowedReqs.add(1);
  if (res.status === 429) deniedReqs.add(1);

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const rpsRate = data.metrics.http_reqs && data.metrics.http_reqs.values.rate ? data.metrics.http_reqs.values.rate.toFixed(1) : '0';
  const dur = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const p50 = (dur.med !== undefined ? dur.med : dur['p(50)'] !== undefined ? dur['p(50)'] : 0).toFixed(2);
  const p90 = (dur['p(90)'] !== undefined ? dur['p(90)'] : 0).toFixed(2);
  const p95 = (dur['p(95)'] !== undefined ? dur['p(95)'] : 0).toFixed(2);
  const p99 = (dur['p(99)'] !== undefined ? dur['p(99)'] : 0).toFixed(2);
  const max = (dur.max !== undefined ? dur.max : 0).toFixed(2);
  const failed = data.metrics.http_req_failed && data.metrics.http_req_failed.values.rate !== undefined 
    ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) 
    : '0.00';
  const dropped = data.metrics.dropped_iterations ? data.metrics.dropped_iterations.values.count : 0;

  const banner = [
    '',
    '======================================================================',
    '                   RLAAS STRESS TEST REPORT                          ',
    '======================================================================',
    ` Total Requests Dispatched  : ${httpReqs}`,
    ` Average Throughput         : ${rpsRate} req/sec`,
    ` Target Peak RPS            : ${PEAK_RPS} req/sec`,
    ` Dropped Iterations (k6 VU) : ${dropped}`,
    '----------------------------------------------------------------------',
    ' LATENCY BREAKDOWN (Across All Stress Tiers):',
    `   P50 (Median)   : ${p50} ms`,
    `   P90 Latency    : ${p90} ms`,
    `   P95 Latency    : ${p95} ms`,
    `   P99 Latency    : ${p99} ms`,
    `   Max Latency    : ${max} ms`,
    `   Error Rate     : ${failed} %`,
    '----------------------------------------------------------------------',
    dropped > 0 
      ? ` ⚠️  CLIENT SATURATION: ${dropped} iterations dropped because k6 hit VU capacity.` 
      : ' 🚀 CLIENT CAPACITY: k6 was able to dispatch all planned requests cleanly.',
    (parseFloat(p95) <= 150)
      ? ' 🎯 PERFORMANCE VERDICT: System sustained extreme stress within P95 <= 150ms!'
      : ` ⚡ BREAKING POINT DETECTED: Latency escalated to P95 = ${p95}ms under high stress.`,
    '======================================================================',
    '',
    textSummary(data, { indent: ' ', enableColors: true }),
  ].join('\n');

  return {
    stdout: banner,
  };
}
