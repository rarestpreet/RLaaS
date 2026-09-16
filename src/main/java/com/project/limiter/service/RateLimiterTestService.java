package com.project.limiter.service;

import com.project.limiter.dto.request.RateLimitTestRequest;
import com.project.limiter.dto.response.Decision;

public interface RateLimiterTestService {

    Decision checkFreeRateLimit(RateLimitTestRequest request, String clientIp);
}
