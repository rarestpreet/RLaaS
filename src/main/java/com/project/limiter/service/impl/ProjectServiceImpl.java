package com.project.limiter.service.impl;

import com.project.limiter.dto.request.CreateProjectRequest;
import com.project.limiter.dto.request.UpdateProjectRequest;
import com.project.limiter.dto.response.ProjectResponse;
import com.project.limiter.exception.DuplicateResourceException;
import com.project.limiter.exception.ResourceNotFoundException;
import com.project.limiter.model.Customer;
import com.project.limiter.model.Project;
import com.project.limiter.model.enums.ProjectStatus;
import com.project.limiter.repository.CustomerRepository;
import com.project.limiter.repository.ProjectRepository;
import com.project.limiter.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional
    public ProjectResponse createProject(UUID customerId, CreateProjectRequest request) {
        log.info("Creating project '{}' for customerId: {}", request.getName(), customerId);

        // Verify customer exists (CustomerUserDetails guarantees they're authenticated,
        // but we still need the entity reference for the FK)
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        // Uniqueness: project name must be unique per customer
        if (projectRepository.existsByCustomerIdAndName(customerId, request.getName())) {
            throw new DuplicateResourceException(
                    "A project named '" + request.getName() + "' already exists for your account");
        }

        Project project = Project.builder()
                .customer(customer)
                .name(request.getName())
                .status(ProjectStatus.ACTIVE)
                .build();

        Project saved = projectRepository.save(project);
        log.info("Project created with ID: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjects(UUID customerId) {
        log.info("Fetching all projects for customerId: {}", customerId);
        return projectRepository.findByCustomerId(customerId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(UUID customerId, UUID projectId) {
        log.info("Fetching project ID: {} for customerId: {}", projectId, customerId);
        Project project = projectRepository.findByIdAndCustomerId(projectId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project not found with ID: " + projectId));
        return mapToResponse(project);
    }

    @Override
    @Transactional
    public ProjectResponse updateProject(UUID customerId, UUID projectId, UpdateProjectRequest request) {
        log.info("Updating project ID: {} for customerId: {}", projectId, customerId);

        Project project = projectRepository.findByIdAndCustomerId(projectId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project not found with ID: " + projectId));

        // Uniqueness check: new name must not conflict with another project of the same customer
        if (!project.getName().equals(request.getName())
                && projectRepository.existsByCustomerIdAndNameAndIdNot(customerId, request.getName(), projectId)) {
            throw new DuplicateResourceException(
                    "A project named '" + request.getName() + "' already exists for your account");
        }

        project.setName(request.getName());
        project.setStatus(request.getStatus());
        project.markUpdatedAt();
        Project saved = projectRepository.save(project);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteProject(UUID customerId, UUID projectId) {
        log.info("Soft-deleting project ID: {} for customerId: {}", projectId, customerId);

        Project project = projectRepository.findByIdAndCustomerId(projectId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project not found with ID: " + projectId));

        project.setStatus(ProjectStatus.TERMINATED);
        project.markUpdatedAt();
        projectRepository.save(project);
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .customerId(project.getCustomer().getId())
                .name(project.getName())
                .status(project.getStatus())
                .policyCount(project.getPolicies() != null ? project.getPolicies().size() : 0)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
