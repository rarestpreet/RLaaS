package com.project.limiter.model.strategy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitContext {

    private String userId;
    private String clientIp;
    private String apiKey;
    private String headerName;

    @Builder.Default
    private Map<String, String> customHeaders = new HashMap<>();

}
