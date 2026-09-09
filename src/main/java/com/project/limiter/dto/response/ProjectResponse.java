package com.project.limiter.dto.response;

import com.project.limiter.model.enums.ProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private UUID id;
    private UUID customerId;
    private String name;
    private ProjectStatus status;
    private int policyCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
