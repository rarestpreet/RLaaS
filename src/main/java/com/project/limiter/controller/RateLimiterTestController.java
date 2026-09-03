package com.project.limiter.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.algorithm.TokenBucketAlgorithm;
import com.project.limiter.algorithm.AnchoredWindowAlgorithm;
import com.project.limiter.dto.request.RateLimitTestRequest;
import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.model.enums.AlgorithmType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test/rate-limit")
@RequiredArgsConstructor
public class RateLimiterTestController {

    private final TokenBucketAlgorithm tokenBucketAlgorithm;
    private final AnchoredWindowAlgorithm anchoredWindowAlgorithm;
    private final ObjectMapper objectMapper;

    @PostMapping("/check")
    public ResponseEntity<Decision> checkRateLimit(@Valid @RequestBody RateLimitTestRequest request) {
        AlgorithmType type = AlgorithmType.valueOf(request.getAlgorithmType().toUpperCase());
        AlgorithmConfig config;

        switch (type) {
            case TOKEN_BUCKET -> config = objectMapper.convertValue(request.getConfig(), TokenBucketConfig.class);
            case ANCHORED_WINDOW -> config = objectMapper.convertValue(request.getConfig(), AnchoredWindowConfig.class);
            default -> throw new IllegalArgumentException("Unsupported algorithm type: " + request.getAlgorithmType());
        }

        Decision decision;
        if (type == AlgorithmType.TOKEN_BUCKET) {
            decision = tokenBucketAlgorithm.resolveRequest(request.getBucketKey(), config);
        } else {
            decision = anchoredWindowAlgorithm.resolveRequest(request.getBucketKey(), config);
        }

        return ResponseEntity.ok(decision);
    }
}
