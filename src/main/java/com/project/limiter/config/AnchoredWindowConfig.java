package com.project.limiter.config;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public final class AnchoredWindowConfig implements AlgorithmConfig {

    @Positive(message = "limit must be greater than 0")
    private long limit;

    @Positive(message = "windowMs must be greater than 0")
    private long windowMs;
}
