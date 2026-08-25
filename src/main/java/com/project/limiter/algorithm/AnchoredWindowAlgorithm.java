package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.AnchoredWindowConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public non-sealed class AnchoredWindowAlgorithm implements Algorithm {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Decision resolveRequest(String bucketKey, AlgorithmConfig config) {
        if (!(config instanceof AnchoredWindowConfig anchoredWindowConfig)) {
            throw new IllegalArgumentException("Invalid config type for AnchoredWindowAlgorithm");
        }

        log.debug("Executing AnchoredWindowAlgorithm for key: {}, limit: {}", bucketKey, anchoredWindowConfig.getLimit());

        // TODO: implement atomic Lua script for anchored window. Must 
        // check/create window start timestamp, increment count if within 
        // windowMs, reset if expired — all atomically in a single Redis 
        // round trip.

        long limit = anchoredWindowConfig.getLimit();
        long remaining = Math.max(0, limit - 1);

        return Decision.builder()
                .allowed(true)
                .remaining(remaining)
                .retryAfterMs(0)
                .build();
    }

}
