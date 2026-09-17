package com.project.limiter.dto.request;

import com.project.limiter.model.enums.FailMode;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialCheckRequest {

    @NotBlank(message = "algorithmType is required (TOKEN_BUCKET or ANCHORED_WINDOW)")
    private String algorithmType;

    @NotBlank(message = "bucketKey is required")
    private String bucketKey;

    // Token Bucket Parameters
    private Long capacity;
    private Integer refillRate;
    private Long refillIntervalMs;
    private Long ttlMs;

    // Anchored Window Parameters
    private Long limit;
    private Long windowMs;

    // Optional cost per request (defaults to 1)
    private Long cost;

    // User-decided fail safe mode
    private FailMode failMode;
}
