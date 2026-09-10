package com.project.limiter.repository;

import com.project.limiter.model.ApiKey;
import com.project.limiter.model.enums.ApiKeyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    List<ApiKey> findByCustomerId(UUID customerId);

    Optional<ApiKey> findByIdAndCustomerId(UUID id, UUID customerId);

    Optional<ApiKey> findByPrefix(String prefix);

    Optional<ApiKey> findByKeyHash(String keyHash);

    long countByCustomerIdAndStatus(UUID customerId, ApiKeyStatus status);
}
