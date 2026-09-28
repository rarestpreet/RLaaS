import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metric counters & trends
export const allowCount = new Counter('rlaas_allowed_requests');
export const denyCount = new Counter('rlaas_denied_requests');
export const decisionLatency = new Trend('rlaas_decision_duration', true);
export const failureRate = new Rate('rlaas_http_failures');

export const options = {
  scenarios: {
    // 1. Sustained load test: ramps up to 100 VUs to test sustained 200+ RPS
    sustained_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 50 },  // Ramp-up
        { duration: '1m',  target: 100 }, // Steady state sustained load
        { duration: '30s', target: 0 },   // Cool-down
      ],
      gracefulRampDown: '10s',
    },
    // 2. High concurrency burst test: rapid spike to evaluate atomic Lua correctness
    burst_spike: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 20,
      startTime: '2m30s', // Starts after load test
    },
  },
  thresholds: {
    // 95% of rate limit decisions must complete within 15ms, 99% within 30ms
    'http_req_duration': ['p(95)<15', 'p(99)<30'],
    // Unhandled HTTP 5xx errors must remain below 1%
    'rlaas_http_failures': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || 'rlaas_live_sampleApiKeySecretHere';
const ENDPOINT = __ENV.ENDPOINT || '/api/v1/checkout';

export default function () {
  const url = `${BASE_URL}/v1/check`;
  const payload = JSON.stringify({
    endpoint: ENDPOINT,
    clientIp: `192.168.1.${__VU % 20}`, // Rotate across 20 distinct client IPs
    userId: `user_${__VU}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  };

  const res = http.post(url, payload, params);

  // Track decision latency
  decisionLatency.add(res.timings.duration);

  // Evaluate response
  const is200 = res.status === 200;
  const is429 = res.status === 429;
  const isServerError = res.status >= 500;

  if (is200) allowCount.add(1);
  if (is429) denyCount.add(1);
  failureRate.add(isServerError);

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has rate limit limit header': (r) => r.headers['X-Ratelimit-Limit'] !== undefined,
    'has remaining header': (r) => r.headers['X-Ratelimit-Remaining'] !== undefined,
    'has reset header': (r) => r.headers['X-Ratelimit-Reset'] !== undefined,
  });

  sleep(0.01); // 10ms pacing between iterations
}
