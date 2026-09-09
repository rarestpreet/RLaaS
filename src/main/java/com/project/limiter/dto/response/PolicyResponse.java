package com.project.limiter.dto.response;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.enums.PolicyStatus;
import com.project.limiter.model.strategy.KeyStrategyConfig;
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
public class PolicyResponse {

    private UUID id;
    private UUID projectId;
    private String name;
    private String endpoint;
    private AlgorithmType algorithmType;
    private AlgorithmConfig algorithmConfig;
    private KeyStrategyConfig keyStrategy;
    private FailMode failMode;
    private PolicyStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
