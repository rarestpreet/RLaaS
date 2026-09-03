package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.exception.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public non-sealed class AnchoredWindowAlgorithm implements Algorithm {

    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public Decision resolveRequest(String bucketKey, AlgorithmConfig config) {
        if (!(config instanceof AnchoredWindowConfig anchoredWindowConfig)) {
            throw new IllegalArgumentException("Invalid config type for AnchoredWindowAlgorithm");
        }

        log.info("Executing AnchoredWindowAlgorithm for key: {}, limit: {}", bucketKey, anchoredWindowConfig.getLimit());

        // TODO: implement atomic Lua script for anchored window. Must
        // check/create window start timestamp, increment count if within
        // windowMs, reset if expired — all atomically in a single Redis
        // round trip.

        String bucketValue = redisTemplate.opsForValue().get(bucketKey);
        int currentRequestCount = (bucketValue != null ? Integer.parseInt(bucketValue) : 0) + 1;

        long limit = anchoredWindowConfig.getLimit();
        long remaining;

        if (bucketValue == null) {
            redisTemplate.opsForValue().set(bucketKey, String.valueOf(currentRequestCount), Duration.ofMinutes(1));
            remaining = limit - 1;
        } else {
            if (currentRequestCount > limit) {
                throw new RateLimitExceededException("The rate limited is exceeded for user %s, please try again after %d".formatted(bucketKey, redisTemplate.getExpire(bucketKey, TimeUnit.SECONDS)));
            } else {
                redisTemplate.opsForValue().increment(bucketKey);
                remaining = limit - currentRequestCount;
            }
        }
        log.info("Completed request, currentReq: {}, remainingReq: {}", currentRequestCount, remaining);

        return Decision.builder()
                .allowed(true)
                .remaining(remaining)
                .cooldownPeriod(0)
                .build();
    }

}
