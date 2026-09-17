export type ApiKeyStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix?: string;
  prefix?: string;
  usage?: number;
  usageCount?: number;
  status: ApiKeyStatus;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  expiresAt?: string | null;
}

export interface ApiKeyCreatedResponse {
  id?: string;
  name: string;
  rawKey: string;
  keyPrefix?: string;
  prefix?: string;
  expiresAt?: string | null;
  createdAt?: string;
}
