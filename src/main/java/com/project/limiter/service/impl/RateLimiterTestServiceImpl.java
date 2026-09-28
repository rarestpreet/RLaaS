package com.project.limiter.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.limiter.algorithm.AnchoredWindowAlgorithm;
import com.project.limiter.algorithm.TokenBucketAlgorithm;
import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.request.RateLimitTestRequest;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.exception.RateLimitExceededException;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.enums.ServiceName;
import com.project.limiter.service.RateLimiterTestService;
import com.project.limiter.service.ServiceHealthRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimiterTestServiceImpl implements RateLimiterTestService {

    private final TokenBucketAlgorithm tokenBucketAlgorithm;
    private final AnchoredWindowAlgorithm anchoredWindowAlgorithm;
    private final ObjectMapper objectMapper;
    private final ServiceHealthRegistry serviceHealthRegistry;

    // Server-enforced limits for test/benchmarking (increased to 1M capacity / 100k refill for stress testing)
    private static final long FREE_MAX_CAPACITY = 1_000_000L;
    private static final int FREE_MAX_REFILL_RATE = 100_000;
    private static final long FREE_MIN_INTERVAL_MS = 10L;

    private static final long FREE_MAX_WINDOW_LIMIT = 1_000_000L;
    private static final long FREE_MIN_WINDOW_MS = 50L;
    private static final long FREE_MAX_WINDOW_MS = 3600000L; // 1 hour max

    @Override
    public Decision checkFreeRateLimit(RateLimitTestRequest request, String clientIp) {
        // Fast-fail health check before calling Redis
        FailMode failMode = request.getFailMode() != null
                ? request.getFailMode()
                : FailMode.FAIL_CLOSED;

        if (!serviceHealthRegistry.isServiceUp(ServiceName.REDIS)) {
            log.warn("Redis is DOWN in ServiceHealthRegistry. Applying fail-safe mode: {}", failMode);
            return executeFailSafe(failMode);
        }

        AlgorithmType type = AlgorithmType.valueOf(request.getAlgorithmType().toUpperCase());
        AlgorithmConfig config;

        // Scope public test keys by client IP to prevent cross-visitor collision
        String sanitizedIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "anonymous";
        String sanitizedKey = request.getBucketKey().replaceAll("[^a-zA-Z0-9_.:-]", "");
        if (sanitizedKey.isBlank()) {
            sanitizedKey = "demo";
        }
        if (sanitizedKey.length() > 64) {
            sanitizedKey = sanitizedKey.substring(0, 64);
        }
        String isolatedBucketKey = "test:free:" + sanitizedIp + ":" + sanitizedKey;

        switch (type) {
            case TOKEN_BUCKET -> {
                TokenBucketConfig raw = objectMapper.convertValue(request.getConfig(), TokenBucketConfig.class);
                long capacity = Math.max(1L, Math.min(FREE_MAX_CAPACITY, raw.getCapacity()));
                int refillRate = Math.max(1, Math.min(FREE_MAX_REFILL_RATE, raw.getRefillRate()));
                long intervalMs = Math.max(FREE_MIN_INTERVAL_MS, Math.min(60000L, raw.getRefillIntervalMs()));
                long ttlMs = Math.max(10000L, Math.min(120000L, raw.getTtlMs() > 0 ? raw.getTtlMs() : 60000L));

                config = TokenBucketConfig.builder()
                        .capacity(capacity)
                        .refillRate(refillRate)
                        .refillIntervalMs(intervalMs)
                        .ttlMs(ttlMs)
                        .build();
            }
            case ANCHORED_WINDOW -> {
                AnchoredWindowConfig raw = objectMapper.convertValue(request.getConfig(), AnchoredWindowConfig.class);
                long limit = Math.max(1L, Math.min(FREE_MAX_WINDOW_LIMIT, raw.getLimit()));
                long windowMs = Math.max(FREE_MIN_WINDOW_MS, Math.min(FREE_MAX_WINDOW_MS, raw.getWindowMs()));

                config = AnchoredWindowConfig.builder()
                        .limit(limit)
                        .windowMs(windowMs)
                        .build();
            }
            default -> throw new IllegalArgumentException("Unsupported algorithm type: " + request.getAlgorithmType());
        }

        Decision decision = null;
        try {
            if (type == AlgorithmType.TOKEN_BUCKET) {
                decision = tokenBucketAlgorithm.resolveRequest(isolatedBucketKey, config);
            } else {
                decision = anchoredWindowAlgorithm.resolveRequest(isolatedBucketKey, config);
            }
        } catch (RateLimitExceededException ex) {
            decision = ex.getDecision();
            if (decision == null) {
                decision = Decision.builder().allowed(false).remaining(0L).cooldownPeriod(1000L).build();
            }
        } catch (Exception ex) {
            log.error("Redis failure during free rate limit check. Marking REDIS down: {}", ex.getMessage());
            serviceHealthRegistry.recordFailure(ServiceName.REDIS, ex.getMessage());
            return executeFailSafe(failMode);
        }

        return decision;
    }

    private Decision executeFailSafe(FailMode failMode) {
        if (failMode == FailMode.FAIL_OPEN) {
            return Decision.builder()
                    .allowed(true)
                    .remaining(1L)
                    .cooldownPeriod(0L)
                    .build();
        } else {
            return Decision.builder()
                    .allowed(false)
                    .remaining(0L)
                    .cooldownPeriod(10000L)
                    .build();
        }
    }
}
