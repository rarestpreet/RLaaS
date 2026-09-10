package com.project.limiter.controller;

import com.project.limiter.dto.request.RateLimitCheckRequest;
import com.project.limiter.dto.response.RateLimitCheckResponse;
import com.project.limiter.dto.response.RateLimitGatewayDecision;
import com.project.limiter.exception.BadCredentialsException;
import com.project.limiter.service.RateLimitGatewayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class RateLimitGatewayController {

    private final RateLimitGatewayService rateLimitGatewayService;

    @PostMapping("/check")
    public ResponseEntity<RateLimitCheckResponse> checkRateLimit(
            @RequestHeader(value = "X-API-Key", required = false) String rawApiKey,
            @Valid @RequestBody RateLimitCheckRequest request) {

        if (rawApiKey == null || rawApiKey.isBlank()) {
            throw new BadCredentialsException("Missing 'X-API-Key' header");
        }

        RateLimitGatewayDecision decision = rateLimitGatewayService.checkRateLimit(rawApiKey.trim(), request);

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
        if (decision.isDegraded()) {
            headers.set("X-RateLimit-Degraded", "true");
        }

        HttpStatus status = decision.isAllowed() ? HttpStatus.OK : HttpStatus.TOO_MANY_REQUESTS;
        return ResponseEntity.status(status).headers(headers).body(decision.getResponseBody());
    }
}
