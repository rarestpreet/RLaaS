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
public final class TokenBucketConfig implements AlgorithmConfig {

    @Positive(message = "capacity must be greater than 0")
    private long capacity;

    @Positive(message = "refillRate must be greater than 0")
    private int refillRate;

    @Positive(message = "refillIntervalMs must be greater than 0")
    private long refillIntervalMs;

    @Positive(message = "ttlMs must be greater than 0")
    private long ttlMs;
}
