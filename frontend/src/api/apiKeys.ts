import { apiFetch } from './client';
import { ApiKey, ApiKeyCreatedResponse, ApiKeyStatus, CreateApiKeyRequest } from '../types/apiKey';

export async function fetchApiKeys(): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>('/api-keys');
}

export async function createApiKey(payload: CreateApiKeyRequest): Promise<ApiKeyCreatedResponse> {
  return apiFetch<ApiKeyCreatedResponse>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateApiKeyStatus(id: string, status: ApiKeyStatus): Promise<ApiKey> {
  return apiFetch<ApiKey>(`/api-keys/${id}/status?status=${status}`, {
    method: 'PATCH',
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  return apiFetch<void>(`/api-keys/${id}`, {
    method: 'DELETE',
  });
}
