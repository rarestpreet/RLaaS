package com.project.limiter.dto.request;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.strategy.KeyStrategyConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePolicyRequest {

    @NotBlank(message = "Policy name is required")
    @Size(max = 150, message = "Policy name must not exceed 150 characters")
    private String name;

    @NotBlank(message = "Endpoint is required")
    @Size(max = 500, message = "Endpoint must not exceed 500 characters")
    private String endpoint;

    @NotNull(message = "Algorithm type is required")
    private AlgorithmType algorithmType;

    @NotNull(message = "Algorithm config is required")
    @Valid
    private AlgorithmConfig algorithmConfig;

    @NotNull(message = "Key strategy is required")
    private KeyStrategyConfig keyStrategy;

    @NotNull(message = "Fail mode is required")
    private FailMode failMode;
}
