package com.project.limiter.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public final class AnchoredWindowConfig implements AlgorithmConfig {
    private long limit;
    private long windowMs;
}
