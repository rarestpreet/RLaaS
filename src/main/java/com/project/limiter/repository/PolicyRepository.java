package com.project.limiter.repository;

import com.project.limiter.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PolicyRepository extends JpaRepository<Policy, UUID> {
    Optional<Policy> findByProjectIdAndEndpoint(UUID projectId, String endpoint);
}
