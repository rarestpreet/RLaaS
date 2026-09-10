package com.project.limiter.service;

import com.project.limiter.dto.request.RateLimitCheckRequest;
import com.project.limiter.dto.response.RateLimitGatewayDecision;

public interface RateLimitGatewayService {

    RateLimitGatewayDecision checkRateLimit(String rawApiKey, RateLimitCheckRequest request);
}
