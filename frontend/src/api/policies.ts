import { apiFetch } from './client';
import { CreatePolicyRequest, Policy, PolicyStatus, UpdatePolicyRequest } from '../types/policy';

export async function fetchPoliciesByProject(projectId: string): Promise<Policy[]> {
  return apiFetch<Policy[]>(`/projects/${projectId}/policies`);
}

export async function fetchPolicyById(policyId: string): Promise<Policy> {
  return apiFetch<Policy>(`/policies?policyId=${policyId}`);
}

export async function createPolicy(projectId: string, payload: CreatePolicyRequest): Promise<Policy> {
  return apiFetch<Policy>(`/projects/${projectId}/policies`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePolicy(policyId: string, payload: UpdatePolicyRequest): Promise<Policy> {
  return apiFetch<Policy>(`/policies?policyId=${policyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updatePolicyStatus(policyId: string, status: PolicyStatus): Promise<Policy> {
  return apiFetch<Policy>(`/policies/status?policyId=${policyId}&status=${status}`, {
    method: 'PATCH',
  });
}

export async function deletePolicy(policyId: string): Promise<void> {
  return apiFetch<void>(`/policies?policyId=${policyId}`, {
    method: 'DELETE',
  });
}
