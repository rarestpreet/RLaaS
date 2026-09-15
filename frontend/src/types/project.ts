export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  policyCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface UpdateProjectRequest {
  name: string;
  status: ProjectStatus;
}
