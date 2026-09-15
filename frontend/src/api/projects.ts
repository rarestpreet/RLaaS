import { apiFetch } from './client';
import { CreateProjectRequest, Project, UpdateProjectRequest } from '../types/project';

export async function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export async function fetchProjectById(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`);
}

export async function createProject(payload: CreateProjectRequest): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProject(projectId: string, payload: UpdateProjectRequest): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}
