package com.project.limiter.repository;

import com.project.limiter.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByCustomerId(UUID customerId);

    Optional<Project> findByIdAndCustomerId(UUID id, UUID customerId);

    boolean existsByCustomerIdAndName(UUID customerId, String name);

    boolean existsByCustomerIdAndNameAndIdNot(UUID customerId, String name, UUID id);
}

