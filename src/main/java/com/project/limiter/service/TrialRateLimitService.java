package com.project.limiter.service;

import com.project.limiter.dto.request.TrialCheckRequest;
import com.project.limiter.dto.response.TrialRateLimitDecision;
import com.project.limiter.model.Customer;

public interface TrialRateLimitService {

    TrialRateLimitDecision checkTrialRateLimit(Customer authenticatedCustomer, String rawApiKey, TrialCheckRequest request);
}
