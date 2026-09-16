import { apiFetch } from './client';
import { DecisionResult, GatewayCheckRequest, TestRateLimitRequest, TrialRateLimitRequest } from '../types/gateway';

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

export async function trialRateLimitCheck(
  payload: TrialRateLimitRequest,
  auth: { apiKey?: string; token?: string } = {}
): Promise<DecisionResult> {
  const start = performance.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.apiKey) {
    headers['X-API-Key'] = auth.apiKey.trim();
  }
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token.trim()}`;
  } else if (!auth.apiKey) {
    const savedToken = localStorage.getItem('rlaas_token');
    if (savedToken) {
      headers['Authorization'] = `Bearer ${savedToken}`;
    }
  }

  try {
    const response = await fetch('/v1/trial/check', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');
    const reset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      // ignore
    }

    if (!response.ok && response.status !== 429) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      decision: data.allowed ? 'ALLOW' : 'REJECT',
      remaining: remaining ? parseInt(remaining, 10) : data.remaining ?? 0,
      limit: limit ? parseInt(limit, 10) : undefined,
      resetSeconds: reset ? parseInt(reset, 10) : undefined,
      retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
      latencyMs,
      timestamp: new Date().toISOString(),
      bucketKey: payload.bucketKey,
    };
  } catch (err: any) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
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
