package com.project.limiter.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitCheckRequest {

    /**
     * Optional projectId to disambiguate if multiple projects have the same endpoint path.
     */
    private UUID projectId;

    @NotBlank(message = "Endpoint path is required")
    private String endpoint;

    private String clientIp;
    private String userId;
    private Map<String, String> customHeaders;
}
