import { apiFetch } from './client';
import { DecisionResult, GatewayCheckRequest, TestRateLimitRequest } from '../types/gateway';

export async function checkRateLimit(apiKey: string, payload: GatewayCheckRequest): Promise<DecisionResult> {
  const start = performance.now();
  const response = await fetch('/v1/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const latencyMs = Math.round((performance.now() - start) * 100) / 100;
  const data = await response.json();

  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  const reset = response.headers.get('X-RateLimit-Reset');
  const retryAfter = response.headers.get('Retry-After');

  return {
    decision: data.decision || (response.status === 429 ? 'REJECT' : 'ALLOW'),
    remaining: remaining ? parseInt(remaining, 10) : data.remaining ?? 0,
    limit: limit ? parseInt(limit, 10) : undefined,
    resetSeconds: reset ? parseInt(reset, 10) : undefined,
    retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
    latencyMs,
    timestamp: new Date().toISOString(),
    endpoint: payload.endpoint,
  };
}

export async function testRateLimitDirect(payload: TestRateLimitRequest): Promise<DecisionResult> {
  const start = performance.now();
  try {
    const data = await apiFetch<any>('/test/rate-limit/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      decision: data.decision || 'ALLOW',
      remaining: data.remainingTokens ?? data.remaining ?? 0,
      resetSeconds: data.resetInSeconds,
      retryAfterSeconds: data.retryAfterSeconds,
      latencyMs,
      timestamp: new Date().toISOString(),
      bucketKey: payload.bucketKey,
    };
  } catch (err: any) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    // If backend is not running or rejected
    return {
      decision: err.message?.includes('429') ? 'REJECT' : 'DENY',
      remaining: 0,
      latencyMs,
      timestamp: new Date().toISOString(),
      bucketKey: payload.bucketKey,
    };
  }
}

export async function fetchHealth(): Promise<any> {
  return apiFetch<any>('/actuator/health');
}
