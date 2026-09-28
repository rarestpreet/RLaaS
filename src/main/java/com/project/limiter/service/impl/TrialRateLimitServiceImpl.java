package com.project.limiter.service.impl;

import com.project.limiter.algorithm.AnchoredWindowAlgorithm;
import com.project.limiter.algorithm.TokenBucketAlgorithm;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.request.TrialCheckRequest;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.dto.response.RateLimitCheckResponse;
import com.project.limiter.dto.response.TrialRateLimitDecision;
import com.project.limiter.exception.BadCredentialsException;
import com.project.limiter.exception.RateLimitExceededException;
import com.project.limiter.model.ApiKey;
import com.project.limiter.model.Customer;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.enums.ServiceName;
import com.project.limiter.service.ApiKeyService;
import com.project.limiter.service.ServiceHealthRegistry;
import com.project.limiter.service.TrialRateLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrialRateLimitServiceImpl implements TrialRateLimitService {

    private final ApiKeyService apiKeyService;
    private final TokenBucketAlgorithm tokenBucketAlgorithm;
    private final AnchoredWindowAlgorithm anchoredWindowAlgorithm;
    private final ServiceHealthRegistry serviceHealthRegistry;

    // Server-enforced boundaries for trial users (increased to support load & concurrency tests)
    private static final long MIN_CAPACITY = 1L;
    private static final long MAX_CAPACITY = 100_000L;
    private static final int MIN_REFILL_RATE = 1;
    private static final int MAX_REFILL_RATE = 25_000;
    private static final long MIN_REFILL_INTERVAL_MS = 10L;
    private static final long MAX_REFILL_INTERVAL_MS = 60000L;

    private static final long MIN_WINDOW_LIMIT = 1L;
    private static final long MAX_WINDOW_LIMIT = 100_000L;
    private static final long MIN_WINDOW_MS = 50L;
    private static final long MAX_WINDOW_MS = 3600000L; // 1 hour max

    @Override
    public TrialRateLimitDecision checkTrialRateLimit(Customer authenticatedCustomer, String rawApiKey, TrialCheckRequest request) {
        // 1. Authenticate customer via API Key or Bearer Session Token
        Customer customer = resolveCustomer(authenticatedCustomer, rawApiKey);

        FailMode failMode = request.getFailMode() != null
                ? request.getFailMode()
                : FailMode.FAIL_CLOSED;

        // 2. Resolve Algorithm Type
        AlgorithmType type;
        try {
            type = AlgorithmType.valueOf(request.getAlgorithmType().toUpperCase());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported algorithm type: " + request.getAlgorithmType() + ". Use TOKEN_BUCKET or ANCHORED_WINDOW.");
        }

        // 3. Namespace bucketKey per Customer to guarantee multi-tenant trial isolation
        String sanitizedKey = request.getBucketKey().replaceAll("[^a-zA-Z0-9_.:-]", "");
        if (sanitizedKey.isBlank()) {
            sanitizedKey = "default";
        }
        if (sanitizedKey.length() > 64) {
            sanitizedKey = sanitizedKey.substring(0, 64);
        }
        String isolatedBucketKey = "trial:" + customer.getId() + ":" + sanitizedKey;

        // 4. Server-enforced clamping on dynamic user configuration
        long configuredLimit = (type == AlgorithmType.TOKEN_BUCKET)
                ? clamp(request.getCapacity() != null ? request.getCapacity() : 10L, MIN_CAPACITY, MAX_CAPACITY)
                : clamp(request.getLimit() != null ? request.getLimit() : 20L, MIN_WINDOW_LIMIT, MAX_WINDOW_LIMIT);

        // Pre-check Redis Health before remote invocation
        if (!serviceHealthRegistry.isServiceUp(ServiceName.REDIS)) {
            log.warn("Redis is DOWN in ServiceHealthRegistry. Applying fail-safe mode {} for trial check", failMode);
            return handleTrialFailSafe(customer, failMode, configuredLimit);
        }

        Decision decision = null;

        try {
            if (type == AlgorithmType.TOKEN_BUCKET) {
                long capacity = configuredLimit;
                int refillRate = (int) clamp(request.getRefillRate() != null ? request.getRefillRate() : 2, MIN_REFILL_RATE, MAX_REFILL_RATE);
                long intervalMs = clamp(request.getRefillIntervalMs() != null ? request.getRefillIntervalMs() : 1000L, MIN_REFILL_INTERVAL_MS, MAX_REFILL_INTERVAL_MS);
                long ttlMs = request.getTtlMs() != null && request.getTtlMs() > 0 ? request.getTtlMs() : 60000L;

                TokenBucketConfig config = TokenBucketConfig.builder()
                        .capacity(capacity)
                        .refillRate(refillRate)
                        .refillIntervalMs(intervalMs)
                        .ttlMs(ttlMs)
                        .build();

                decision = tokenBucketAlgorithm.resolveRequest(isolatedBucketKey, config);
            } else {
                long limit = configuredLimit;
                long windowMs = clamp(request.getWindowMs() != null ? request.getWindowMs() : 60000L, MIN_WINDOW_MS, MAX_WINDOW_MS);

                AnchoredWindowConfig config = AnchoredWindowConfig.builder()
                        .limit(limit)
                        .windowMs(windowMs)
                        .build();

                decision = anchoredWindowAlgorithm.resolveRequest(isolatedBucketKey, config);
            }
        } catch (RateLimitExceededException ex) {
            decision = ex.getDecision();
            if (decision == null) {
                decision = Decision.builder().allowed(false).remaining(0L).cooldownPeriod(1000L).build();
            }
        } catch (Exception ex) {
            log.error("Redis failure during trial rate limit check. Marking REDIS down: {}", ex.getMessage());
            serviceHealthRegistry.recordFailure(ServiceName.REDIS, ex.getMessage());
            return handleTrialFailSafe(customer, failMode, configuredLimit);
        }

        // 5. Build decision result
        boolean allowed = decision.isAllowed();
        long remaining = Math.max(0L, decision.getRemaining());
        long cooldownMs = Math.max(0L, decision.getCooldownPeriod());
        long resetSeconds = Math.max(1L, (long) Math.ceil(cooldownMs / 1000.0));
        Long retryAfterSeconds = allowed ? null : resetSeconds;

        RateLimitCheckResponse responseBody = RateLimitCheckResponse.builder()
                .allowed(allowed)
                .remaining(remaining)
                .resetAfterMs(cooldownMs)
                .retryAfterMs(allowed ? null : cooldownMs)
                .reason(allowed ? null : "TRIAL_RATE_LIMIT_EXCEEDED")
                .build();

        return TrialRateLimitDecision.builder()
                .allowed(allowed)
                .limit(configuredLimit)
                .remaining(remaining)
                .resetSeconds(resetSeconds)
                .retryAfterSeconds(retryAfterSeconds)
                .customerId(customer.getId().toString())
                .responseBody(responseBody)
                .build();
    }

    private Customer resolveCustomer(Customer authenticatedCustomer, String rawApiKey) {
        if (authenticatedCustomer != null) {
            return authenticatedCustomer;
        }

        if (rawApiKey != null && !rawApiKey.isBlank()) {
            ApiKey apiKey = apiKeyService.validateApiKey(rawApiKey.trim());
            if (apiKey != null && apiKey.getCustomer() != null) {
                return apiKey.getCustomer();
            }
            throw new BadCredentialsException("Invalid, expired, or inactive API key provided for trial check");
        }

        throw new BadCredentialsException(
                "Trial check requires authentication: provide either an 'X-API-Key' header or 'Authorization: Bearer <session-token>'");
    }

    private long clamp(long value, long min, long max) {
        return Math.max(min, Math.min(max, value));
    }

    private TrialRateLimitDecision handleTrialFailSafe(Customer customer, FailMode failMode, long configuredLimit) {
        boolean allowed = (failMode == FailMode.FAIL_OPEN);
        long remaining = allowed ? 1L : 0L;
        long resetSeconds = allowed ? 0L : 10L;
        Long retryAfterSeconds = allowed ? null : 10L;
        String reason = allowed ? "FAIL_OPEN_REDIS_UNAVAILABLE" : "REDIS_SERVICE_UNAVAILABLE_FAILSAFE";

        RateLimitCheckResponse responseBody = RateLimitCheckResponse.builder()
                .allowed(allowed)
                .remaining(remaining)
                .resetAfterMs(resetSeconds * 1000L)
                .retryAfterMs(allowed ? null : 10000L)
                .reason(reason)
                .build();

        return TrialRateLimitDecision.builder()
                .allowed(allowed)
                .limit(configuredLimit)
                .remaining(remaining)
                .resetSeconds(resetSeconds)
                .retryAfterSeconds(retryAfterSeconds)
                .customerId(customer.getId().toString())
                .responseBody(responseBody)
                .build();
    }
}
