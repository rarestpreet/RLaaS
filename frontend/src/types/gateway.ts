export interface TestRateLimitRequest {
  bucketKey: string;
  algorithmType: 'TOKEN_BUCKET' | 'ANCHORED_WINDOW';
  config: Record<string, unknown>;
}

export interface DecisionResult {
  decision: 'ALLOW' | 'DENY' | 'REJECT';
  remaining: number;
  limit?: number;
  resetSeconds?: number;
  retryAfterSeconds?: number;
  latencyMs?: number;
  timestamp: string;
  endpoint?: string;
  bucketKey?: string;
}

export interface GatewayCheckRequest {
  endpoint: string;
  projectId?: string;
  clientIp?: string;
  userId?: string;
  customHeaders?: Record<string, string>;
}
