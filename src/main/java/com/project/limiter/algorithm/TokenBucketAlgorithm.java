package com.project.limiter.algorithm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.dto.response.TokenBucket;
import com.project.limiter.exception.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public non-sealed class TokenBucketAlgorithm implements Algorithm {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private static final String HASH_KEY = "rate-limit:token-buckets";

    @Override
    public Decision resolveRequest(String bucketKey, AlgorithmConfig config) {
        if (!(config instanceof TokenBucketConfig tokenBucketConfig)) {
            throw new IllegalArgumentException("Invalid config type for TokenBucketAlgorithm");
        }

        // TODO: implement atomic Lua script for token bucket refill+deduct.
        // Must read current tokens + lastRefillAt, compute refill based on
        // elapsed time (capped at capacity), deduct 1 if available, write
        // back — all atomically in a single Redis round trip.

        long capacity = tokenBucketConfig.getCapacity();

        Object rawValue = redisTemplate.opsForHash().get(HASH_KEY, bucketKey);
        TokenBucket bucketValue = rawValue != null ? objectMapper.convertValue(rawValue, TokenBucket.class) : null;
        long now = System.currentTimeMillis();

        if (bucketValue == null) {
            // First request: consume 1 token, save remaining (capacity - 1)
            long remaining = capacity - 1;
            saveBucket(bucketKey, remaining, now);

            return Decision.builder()
                    .allowed(true)
                    .remaining(remaining)
                    .cooldownPeriod(0)
                    .build();
        }

        TokenBucket refilledBucket = refill(bucketValue, tokenBucketConfig, now);
        long currentTokens = refilledBucket.getRemainingRequestCount();
        long updatedRefillAt = refilledBucket.getLastRefilledAt();

        if (currentTokens > 0) {
            long remaining = currentTokens - 1;
            saveBucket(bucketKey, remaining, updatedRefillAt);

            return Decision.builder()
                    .allowed(true)
                    .remaining(remaining)
                    .cooldownPeriod(0)
                    .build();
        } else {
            long retryAfterMs = Math.max(1, tokenBucketConfig.getRefillIntervalMs()) - (now - updatedRefillAt);
            throw new RateLimitExceededException(
                    "Rate limit exceeded for key %s, retry after %d ms".formatted(bucketKey, Math.max(0, retryAfterMs))
            );
        }
    }

    private TokenBucket refill(TokenBucket currentBucket, TokenBucketConfig config, long now) {
        long refillIntervalMs = Math.max(1, config.getRefillIntervalMs());
        int refillRate = Math.max(1, config.getRefillRate());

        long elapsedTime = Math.max(0, now - currentBucket.getLastRefilledAt());
        long intervalsElapsed = elapsedTime / refillIntervalMs;
        long tokensToAdd = intervalsElapsed * refillRate;

        long refilledTokens = Math.min(config.getCapacity(), currentBucket.getRemainingRequestCount() + tokensToAdd);

        long updatedRefillAt = intervalsElapsed > 0
                ? currentBucket.getLastRefilledAt() + (intervalsElapsed * refillIntervalMs)
                : currentBucket.getLastRefilledAt();

        log.warn("remainingTokens: {}, elapsedTime: {}", refilledTokens, intervalsElapsed + refillIntervalMs);
        return TokenBucket.builder()
                .remainingRequestCount(refilledTokens)
                .lastRefilledAt(updatedRefillAt)
                .build();
    }

    private void saveBucket(String bucketKey, long remainingTokens, long lastRefilledAt) {
        redisTemplate.opsForHash().put(
                HASH_KEY,
                bucketKey,
                TokenBucket.builder()
                        .remainingRequestCount(remainingTokens)
                        .lastRefilledAt(lastRefilledAt)
                        .build()
        );
    }
}
