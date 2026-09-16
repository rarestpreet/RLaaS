package com.project.limiter.controller;

import com.project.limiter.dto.request.TrialCheckRequest;
import com.project.limiter.dto.response.RateLimitCheckResponse;
import com.project.limiter.dto.response.TrialRateLimitDecision;
import com.project.limiter.model.Customer;
import com.project.limiter.security.CustomerUserDetails;
import com.project.limiter.service.TrialRateLimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/trial")
@RequiredArgsConstructor
public class TrialRateLimitController {

    private final TrialRateLimitService trialRateLimitService;

    @PostMapping("/check")
    public ResponseEntity<RateLimitCheckResponse> checkTrialRateLimit(
            @RequestHeader(value = "X-API-Key", required = false) String rawApiKey,
            @AuthenticationPrincipal CustomerUserDetails principal,
            @Valid @RequestBody TrialCheckRequest request) {

        Customer customer = (principal != null) ? principal.getCustomer() : null;
        TrialRateLimitDecision decision = trialRateLimitService.checkTrialRateLimit(customer, rawApiKey, request);

        HttpHeaders headers = new HttpHeaders();
        if (decision.getLimit() != null) {
            headers.set("X-RateLimit-Limit", String.valueOf(decision.getLimit()));
        }
        if (decision.getRemaining() != null) {
            headers.set("X-RateLimit-Remaining", String.valueOf(decision.getRemaining()));
        }
        if (decision.getResetSeconds() != null) {
            headers.set("X-RateLimit-Reset", String.valueOf(decision.getResetSeconds()));
        }
        if (decision.getRetryAfterSeconds() != null) {
            headers.set("Retry-After", String.valueOf(decision.getRetryAfterSeconds()));
        }
        if (decision.getCustomerId() != null) {
            headers.set("X-RateLimit-Customer-Id", decision.getCustomerId());
        }
        headers.set("X-RateLimit-Trial", "true");

        HttpStatus status = decision.isAllowed() ? HttpStatus.OK : HttpStatus.TOO_MANY_REQUESTS;
        return ResponseEntity.status(status).headers(headers).body(decision.getResponseBody());
    }
}
