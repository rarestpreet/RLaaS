package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.exception.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public non-sealed class TokenBucketAlgorithm implements Algorithm {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<List> tokenBucketScript;

    private static final String KEY_PREFIX = "rate-limit:token-bucket:";
    private static final StringRedisSerializer STRING_SERIALIZER = new StringRedisSerializer();

    @Override
    public Decision resolveRequest(String bucketKey, AlgorithmConfig config) {
        if (!(config instanceof TokenBucketConfig tokenBucketConfig)) {
            throw new IllegalArgumentException("Invalid config type for TokenBucketAlgorithm");
        }

        String redisKey = KEY_PREFIX + bucketKey;
        long capacity = tokenBucketConfig.getCapacity();
        long refillRate = tokenBucketConfig.getRefillRate();
        long refillIntervalMs = tokenBucketConfig.getRefillIntervalMs();
        long ttlMs = tokenBucketConfig.getTtlMs();

        List<?> result = redisTemplate.execute(
                tokenBucketScript,
                STRING_SERIALIZER,
                (RedisSerializer<List>) null,
                Collections.singletonList(redisKey),
                String.valueOf(capacity),
                String.valueOf(refillRate),
                String.valueOf(refillIntervalMs),
                String.valueOf(ttlMs)
        );

        if (result == null || result.size() < 3) {
            throw new IllegalStateException("Unexpected response from TokenBucket Redis script");
        }

        boolean allowed = ((Number) result.get(0)).longValue() == 1L;
        long remaining = ((Number) result.get(1)).longValue();
        long cooldownPeriod = ((Number) result.get(2)).longValue();

        Decision decision = Decision.builder()
                .allowed(allowed)
                .remaining(remaining)
                .cooldownPeriod(cooldownPeriod)
                .build();

        if (!decision.isAllowed()) {
            throw new RateLimitExceededException("Rate limit exceeded for key " + bucketKey, decision);
        }

        return decision;
    }
}
