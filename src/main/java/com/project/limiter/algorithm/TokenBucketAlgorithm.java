package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.TokenBucketConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public non-sealed class TokenBucketAlgorithm implements Algorithm {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Decision resolveRequest(String bucketKey, AlgorithmConfig config) {
        if (!(config instanceof TokenBucketConfig tokenBucketConfig)) {
            throw new IllegalArgumentException("Invalid config type for TokenBucketAlgorithm");
        }

        log.debug("Executing TokenBucketAlgorithm for key: {}, capacity: {}", bucketKey, tokenBucketConfig.getCapacity());

        // TODO: implement atomic Lua script for token bucket refill+deduct.
        // Must read current tokens + lastRefillAt, compute refill based on 
        // elapsed time (capped at capacity), deduct 1 if available, write 
        // back — all atomically in a single Redis round trip.

        long capacity = tokenBucketConfig.getCapacity();
        long remaining = Math.max(0, capacity - 1);

        return Decision.builder()
                .allowed(true)
                .remaining(remaining)
                .retryAfterMs(0)
                .build();
    }
}
