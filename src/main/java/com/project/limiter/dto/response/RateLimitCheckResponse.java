package com.project.limiter.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitCheckResponse {

    private boolean allowed;
    private Long remaining;
    private Long resetAfterMs;
    private Long retryAfterMs;
    private String reason;
}
