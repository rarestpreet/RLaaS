package com.project.limiter.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public final class TokenBucketConfig implements AlgorithmConfig {
    private long capacity;
    private double refillRate;
    private long refillIntervalMs;
}
