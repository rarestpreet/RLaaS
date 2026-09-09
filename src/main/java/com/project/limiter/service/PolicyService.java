package com.project.limiter.service;

import com.project.limiter.dto.request.CreatePolicyRequest;
import com.project.limiter.dto.request.UpdatePolicyRequest;
import com.project.limiter.dto.response.PolicyResponse;
import com.project.limiter.model.enums.PolicyStatus;

import java.util.List;
import java.util.UUID;

public interface PolicyService {

    PolicyResponse createPolicy(UUID customerId, UUID projectId, CreatePolicyRequest request);

    List<PolicyResponse> getPoliciesByProject(UUID customerId, UUID projectId);

    PolicyResponse getPolicyById(UUID customerId, UUID policyId);

    PolicyResponse updatePolicy(UUID customerId, UUID policyId, UpdatePolicyRequest request);

    PolicyResponse updatePolicyStatus(UUID customerId, UUID policyId, PolicyStatus status);

    void deletePolicy(UUID customerId, UUID policyId);
}
