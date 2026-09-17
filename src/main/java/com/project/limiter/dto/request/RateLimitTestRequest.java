package com.project.limiter.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.project.limiter.model.enums.FailMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitTestRequest {

    @NotBlank(message = "algorithmType is required (TOKEN_BUCKET or ANCHORED_WINDOW)")
    private String algorithmType;

    @NotBlank(message = "bucketKey is required")
    private String bucketKey;

    @NotNull(message = "config object is required")
    private JsonNode config;

    private FailMode failMode;
}
