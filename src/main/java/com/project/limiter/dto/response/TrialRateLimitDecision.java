package com.project.limiter.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrialRateLimitDecision {

    private boolean allowed;
    private Long limit;
    private Long remaining;
    private Long resetSeconds;
    private Long retryAfterSeconds;
    private String customerId;
    private RateLimitCheckResponse responseBody;
}
