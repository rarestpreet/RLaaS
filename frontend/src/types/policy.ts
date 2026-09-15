export type AlgorithmType = 'TOKEN_BUCKET' | 'ANCHORED_WINDOW';
export type FailMode = 'FAIL_OPEN' | 'FAIL_CLOSED';
export type PolicyStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export type KeyStrategyType = 'IP' | 'USER' | 'API_KEY' | 'CUSTOM' | 'COMPOSITE';

export interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  refillIntervalMs: number;
  ttlMs?: number;
}

export interface AnchoredWindowConfig {
  limit: number;
  windowMs: number;
}

export interface KeyStrategyConfig {
  type: KeyStrategyType;
  headerName?: string;
  strategies?: KeyStrategyConfig[];
}

export interface Policy {
  id: string;
  projectId: string;
  name: string;
  endpoint: string;
  algorithmType: AlgorithmType;
  algorithmConfig: TokenBucketConfig | AnchoredWindowConfig;
  keyStrategy: KeyStrategyConfig;
  failMode: FailMode;
  status: PolicyStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePolicyRequest {
  name: string;
  endpoint: string;
  algorithmType: AlgorithmType;
  algorithmConfig: TokenBucketConfig | AnchoredWindowConfig;
  keyStrategy: KeyStrategyConfig;
  failMode: FailMode;
}

export interface UpdatePolicyRequest {
  name: string;
  endpoint: string;
  algorithmType: AlgorithmType;
  algorithmConfig: TokenBucketConfig | AnchoredWindowConfig;
  keyStrategy: KeyStrategyConfig;
  failMode: FailMode;
  status: PolicyStatus;
}
