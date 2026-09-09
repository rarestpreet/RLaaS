package com.project.limiter.service;

import com.project.limiter.dto.request.CreateProjectRequest;
import com.project.limiter.dto.request.UpdateProjectRequest;
import com.project.limiter.dto.response.ProjectResponse;

import java.util.List;
import java.util.UUID;

public interface ProjectService {

    ProjectResponse createProject(UUID customerId, CreateProjectRequest request);

    List<ProjectResponse> getProjects(UUID customerId);

    ProjectResponse getProjectById(UUID customerId, UUID projectId);

    ProjectResponse updateProject(UUID customerId, UUID projectId, UpdateProjectRequest request);

    void deleteProject(UUID customerId, UUID projectId);
}
