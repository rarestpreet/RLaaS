package com.project.limiter.service.impl;

import com.project.limiter.algorithm.AnchoredWindowAlgorithm;
import com.project.limiter.algorithm.TokenBucketAlgorithm;
import com.project.limiter.config.AnchoredWindowConfig;
import com.project.limiter.config.TokenBucketConfig;
import com.project.limiter.dto.request.RateLimitCheckRequest;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.dto.response.RateLimitCheckResponse;
import com.project.limiter.dto.response.RateLimitGatewayDecision;
import com.project.limiter.exception.BadCredentialsException;
import com.project.limiter.exception.RateLimitExceededException;
import com.project.limiter.exception.ResourceNotFoundException;
import com.project.limiter.model.ApiKey;
import com.project.limiter.model.Policy;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.enums.PolicyStatus;
import com.project.limiter.model.strategy.RateLimitContext;
import com.project.limiter.repository.PolicyRepository;
import com.project.limiter.service.ApiKeyService;
import com.project.limiter.service.RateLimitGatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitGatewayServiceImpl implements RateLimitGatewayService {

    private final ApiKeyService apiKeyService;
    private final PolicyRepository policyRepository;
    private final TokenBucketAlgorithm tokenBucketAlgorithm;
    private final AnchoredWindowAlgorithm anchoredWindowAlgorithm;

    @Override
    @Transactional
    public RateLimitGatewayDecision checkRateLimit(String rawApiKey, RateLimitCheckRequest request) {
        // 1. Authenticate API Key
        ApiKey apiKey = apiKeyService.validateApiKey(rawApiKey);
        if (apiKey == null) {
            log.warn("Invalid, expired, or inactive API key provided for rate limit check");
            throw new BadCredentialsException("Invalid, expired, or inactive API key");
        }

        // 2. Resolve Policy
        Policy policy = resolvePolicy(apiKey, request);

        // 3. Extract Target Key via KeyStrategy
        RateLimitContext context = RateLimitContext.builder()
                .clientIp(request.getClientIp())
                .userId(request.getUserId())
                .apiKey(rawApiKey)
                .customHeaders(request.getCustomHeaders() != null ? request.getCustomHeaders() : Collections.emptyMap())
                .build();

        String targetKey = policy.getKeyStrategy().resolveKey(context);
        String bucketKey = policy.getId() + ":" + targetKey;
        long limit = getLimit(policy);

        // 4. Execute Algorithm with Circuit Breaker / FailMode fallback
        Decision decision;
        try {
            if (policy.getAlgorithmType() == AlgorithmType.TOKEN_BUCKET) {
                decision = tokenBucketAlgorithm.resolveRequest(bucketKey, policy.getAlgorithmConfig());
            } else if (policy.getAlgorithmType() == AlgorithmType.ANCHORED_WINDOW) {
                decision = anchoredWindowAlgorithm.resolveRequest(bucketKey, policy.getAlgorithmConfig());
            } else {
                throw new IllegalStateException("Unsupported algorithm type: " + policy.getAlgorithmType());
            }
        } catch (RateLimitExceededException ex) {
            decision = ex.getDecision();
            if (decision == null) {
                decision = Decision.builder().allowed(false).remaining(0L).cooldownPeriod(1000L).build();
            }
        } catch (Exception ex) {
            log.error("Redis error while evaluating rate limit for bucketKey: {}. Applying failMode: {}", bucketKey, policy.getFailMode(), ex);
            return handleRedisFailure(policy, limit);
        }

        // 5. Build Decision Result
        boolean allowed = decision.isAllowed();
        long remaining = Math.max(0L, decision.getRemaining());
        long cooldownMs = Math.max(0L, decision.getCooldownPeriod());
        long resetSeconds = Math.max(1L, (long) Math.ceil(cooldownMs / 1000.0));
        Long retryAfterSeconds = allowed ? null : resetSeconds;

        RateLimitCheckResponse body = RateLimitCheckResponse.builder()
                .allowed(allowed)
                .remaining(remaining)
                .resetAfterMs(cooldownMs)
                .retryAfterMs(allowed ? null : cooldownMs)
                .reason(allowed ? null : "RATE_LIMIT_EXCEEDED")
                .build();

        return RateLimitGatewayDecision.builder()
                .allowed(allowed)
                .limit(limit)
                .remaining(remaining)
                .resetSeconds(resetSeconds)
                .retryAfterSeconds(retryAfterSeconds)
                .degraded(false)
                .responseBody(body)
                .build();
    }

    private Policy resolvePolicy(ApiKey apiKey, RateLimitCheckRequest request) {
        if (request.getProjectId() != null) {
            Policy policy = policyRepository.findByProjectIdAndEndpointAndStatus(
                    request.getProjectId(), request.getEndpoint(), PolicyStatus.ACTIVE)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No active rate limit policy found for endpoint '" + request.getEndpoint() + "' in project ID: " + request.getProjectId()));

            if (!policy.getProject().getCustomer().getId().equals(apiKey.getCustomer().getId())) {
                throw new ResourceNotFoundException(
                        "No active rate limit policy found for endpoint '" + request.getEndpoint() + "' in project ID: " + request.getProjectId());
            }
            return policy;
        }

        List<Policy> policies = policyRepository.findByProjectCustomerIdAndEndpointAndStatus(
                apiKey.getCustomer().getId(), request.getEndpoint(), PolicyStatus.ACTIVE);

        if (policies.isEmpty()) {
            throw new ResourceNotFoundException("No active rate limit policy configured for endpoint: " + request.getEndpoint());
        }

        if (policies.size() > 1) {
            throw new IllegalArgumentException(
                    "Multiple projects define endpoint '" + request.getEndpoint() + "'. Please specify 'projectId' in request.");
        }

        return policies.get(0);
    }

    private long getLimit(Policy policy) {
        if (policy.getAlgorithmConfig() instanceof TokenBucketConfig tb) {
            return tb.getCapacity();
        } else if (policy.getAlgorithmConfig() instanceof AnchoredWindowConfig aw) {
            return aw.getLimit();
        }
        return 0L;
    }

    private RateLimitGatewayDecision handleRedisFailure(Policy policy, long limit) {
        if (policy.getFailMode() == FailMode.FAIL_OPEN) {
            return RateLimitGatewayDecision.builder()
                    .allowed(true)
                    .limit(limit)
                    .remaining(1L)
                    .resetSeconds(0L)
                    .retryAfterSeconds(null)
                    .degraded(true)
                    .responseBody(RateLimitCheckResponse.builder()
                            .allowed(true)
                            .remaining(1L)
                            .resetAfterMs(0L)
                            .retryAfterMs(null)
                            .reason("SERVICE_DEGRADED_FAIL_OPEN")
                            .build())
                    .build();
        } else {
            return RateLimitGatewayDecision.builder()
                    .allowed(false)
                    .limit(limit)
                    .remaining(0L)
                    .resetSeconds(5L)
                    .retryAfterSeconds(5L)
                    .degraded(true)
                    .responseBody(RateLimitCheckResponse.builder()
                            .allowed(false)
                            .remaining(0L)
                            .resetAfterMs(5000L)
                            .retryAfterMs(5000L)
                            .reason("SERVICE_UNAVAILABLE_FAIL_CLOSED")
                            .build())
                    .build();
        }
    }
}
