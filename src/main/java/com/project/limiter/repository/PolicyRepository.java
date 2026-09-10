package com.project.limiter.repository;

import com.project.limiter.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    Optional<Policy> findByProjectIdAndEndpoint(UUID projectId, String endpoint);

    List<Policy> findByProjectId(UUID projectId);

    // Ownership check: policy must belong to a project owned by this customer
    Optional<Policy> findByIdAndProjectCustomerId(UUID policyId, UUID customerId);

    boolean existsByProjectIdAndName(UUID projectId, String name);

    boolean existsByProjectIdAndNameAndIdNot(UUID projectId, String name, UUID id);

    boolean existsByProjectIdAndEndpoint(UUID projectId, String endpoint);

    boolean existsByProjectIdAndEndpointAndIdNot(UUID projectId, String endpoint, UUID id);

    Optional<Policy> findByProjectIdAndEndpointAndStatus(UUID projectId, String endpoint, com.project.limiter.model.enums.PolicyStatus status);

    List<Policy> findByProjectCustomerIdAndEndpointAndStatus(UUID customerId, String endpoint, com.project.limiter.model.enums.PolicyStatus status);
}

