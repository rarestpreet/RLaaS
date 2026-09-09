package com.project.limiter.service.impl;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.request.CreatePolicyRequest;
import com.project.limiter.dto.request.UpdatePolicyRequest;
import com.project.limiter.dto.response.PolicyResponse;
import com.project.limiter.exception.DuplicateResourceException;
import com.project.limiter.exception.InvalidPolicyConfigurationException;
import com.project.limiter.exception.ResourceNotFoundException;
import com.project.limiter.model.Policy;
import com.project.limiter.model.Project;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.PolicyStatus;
import com.project.limiter.repository.PolicyRepository;
import com.project.limiter.repository.ProjectRepository;
import com.project.limiter.service.PolicyService;
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
public class PolicyServiceImpl implements PolicyService {

    private final PolicyRepository policyRepository;
    private final ProjectRepository projectRepository;

    @Override
    @Transactional
    public PolicyResponse createPolicy(UUID customerId, UUID projectId, CreatePolicyRequest request) {
        log.info("Creating policy '{}' for projectId: {}, customerId: {}", request.getName(), projectId, customerId);

        // Ownership check: project must belong to this customer
        Project project = projectRepository.findByIdAndCustomerId(projectId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project not found with ID: " + projectId));

        // Validate algorithmConfig matches algorithmType
        validateConfigMatchesType(request.getAlgorithmType(), request.getAlgorithmConfig());

        // Uniqueness: policy name must be unique within a project
        if (policyRepository.existsByProjectIdAndName(projectId, request.getName())) {
            throw new DuplicateResourceException(
                    "A policy named '" + request.getName() + "' already exists in this project");
        }

        // Uniqueness: endpoint must be unique within a project
        if (policyRepository.existsByProjectIdAndEndpoint(projectId, request.getEndpoint())) {
            throw new DuplicateResourceException(
                    "A policy for endpoint '" + request.getEndpoint() + "' already exists in this project");
        }

        Policy policy = Policy.builder()
                .project(project)
                .name(request.getName())
                .endpoint(request.getEndpoint())
                .algorithmType(request.getAlgorithmType())
                .algorithmConfig(request.getAlgorithmConfig())
                .keyStrategy(request.getKeyStrategy())
                .failMode(request.getFailMode())
                .status(PolicyStatus.ACTIVE)
                .build();

        Policy saved = policyRepository.save(policy);
        log.info("Policy created with ID: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyResponse> getPoliciesByProject(UUID customerId, UUID projectId) {
        log.info("Fetching policies for projectId: {}, customerId: {}", projectId, customerId);

        // Verify project ownership before listing its policies
        projectRepository.findByIdAndCustomerId(projectId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project not found with ID: " + projectId));

        return policyRepository.findByProjectId(projectId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PolicyResponse getPolicyById(UUID customerId, UUID policyId) {
        log.info("Fetching policyId: {} for customerId: {}", policyId, customerId);
        Policy policy = policyRepository.findByIdAndProjectCustomerId(policyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Policy not found with ID: " + policyId));
        return mapToResponse(policy);
    }

    @Override
    @Transactional
    public PolicyResponse updatePolicy(UUID customerId, UUID policyId, UpdatePolicyRequest request) {
        log.info("Updating policyId: {} for customerId: {}", policyId, customerId);

        Policy policy = policyRepository.findByIdAndProjectCustomerId(policyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Policy not found with ID: " + policyId));

        // Validate algorithmConfig matches algorithmType
        validateConfigMatchesType(request.getAlgorithmType(), request.getAlgorithmConfig());

        UUID projectId = policy.getProject().getId();

        // Uniqueness: name must not conflict with another policy in the same project
        if (!policy.getName().equals(request.getName())
                && policyRepository.existsByProjectIdAndNameAndIdNot(projectId, request.getName(), policyId)) {
            throw new DuplicateResourceException(
                    "A policy named '" + request.getName() + "' already exists in this project");
        }

        // Uniqueness: endpoint must not conflict with another policy in the same project
        if (!policy.getEndpoint().equals(request.getEndpoint())
                && policyRepository.existsByProjectIdAndEndpointAndIdNot(projectId, request.getEndpoint(), policyId)) {
            throw new DuplicateResourceException(
                    "A policy for endpoint '" + request.getEndpoint() + "' already exists in this project");
        }

        policy.setName(request.getName());
        policy.setEndpoint(request.getEndpoint());
        policy.setAlgorithmType(request.getAlgorithmType());
        policy.setAlgorithmConfig(request.getAlgorithmConfig());
        policy.setKeyStrategy(request.getKeyStrategy());
        policy.setFailMode(request.getFailMode());
        policy.setStatus(request.getStatus());
        policy.markUpdatedAt();

        Policy saved = policyRepository.save(policy);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PolicyResponse updatePolicyStatus(UUID customerId, UUID policyId, PolicyStatus status) {
        log.info("Updating status of policyId: {} to {} for customerId: {}", policyId, status, customerId);

        Policy policy = policyRepository.findByIdAndProjectCustomerId(policyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Policy not found with ID: " + policyId));

        policy.setStatus(status);
        policy.markUpdatedAt();
        Policy saved = policyRepository.save(policy);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deletePolicy(UUID customerId, UUID policyId) {
        log.info("Soft-deleting policyId: {} for customerId: {}", policyId, customerId);

        Policy policy = policyRepository.findByIdAndProjectCustomerId(policyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Policy not found with ID: " + policyId));

        policy.setStatus(PolicyStatus.TERMINATED);
        policy.markUpdatedAt();
        policyRepository.save(policy);
    }

    // Ensures the algorithmConfig concrete type matches the declared algorithmType
    private void validateConfigMatchesType(AlgorithmType type, AlgorithmConfig config) {
        if (type == AlgorithmType.TOKEN_BUCKET && !(config instanceof TokenBucketConfig)) {
            throw new InvalidPolicyConfigurationException(
                    "algorithmType is TOKEN_BUCKET but algorithmConfig does not contain valid token bucket fields " +
                    "(capacity, refillRate, refillIntervalMs, ttlMs)");
        }
        if (type == AlgorithmType.ANCHORED_WINDOW && !(config instanceof AnchoredWindowConfig)) {
            throw new InvalidPolicyConfigurationException(
                    "algorithmType is ANCHORED_WINDOW but algorithmConfig does not contain valid anchored window fields " +
                    "(limit, windowMs)");
        }
    }

    private PolicyResponse mapToResponse(Policy policy) {
        return PolicyResponse.builder()
                .id(policy.getId())
                .projectId(policy.getProject().getId())
                .name(policy.getName())
                .endpoint(policy.getEndpoint())
                .algorithmType(policy.getAlgorithmType())
                .algorithmConfig(policy.getAlgorithmConfig())
                .keyStrategy(policy.getKeyStrategy())
                .failMode(policy.getFailMode())
                .status(policy.getStatus())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
