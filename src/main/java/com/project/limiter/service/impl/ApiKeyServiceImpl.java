package com.project.limiter.service.impl;

import com.project.limiter.dto.request.CreateApiKeyRequest;
import com.project.limiter.dto.response.ApiKeyCreatedResponse;
import com.project.limiter.dto.response.ApiKeyResponse;
import com.project.limiter.exception.ResourceNotFoundException;
import com.project.limiter.model.ApiKey;
import com.project.limiter.model.Customer;
import com.project.limiter.model.enums.ApiKeyStatus;
import com.project.limiter.repository.ApiKeyRepository;
import com.project.limiter.repository.CustomerRepository;
import com.project.limiter.service.ApiKeyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyServiceImpl implements ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final CustomerRepository customerRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_ACTIVE_KEYS_PER_CUSTOMER = 5;

    @Override
    @Transactional
    public ApiKeyCreatedResponse createApiKey(UUID customerId, CreateApiKeyRequest request) {
        log.info("Creating API key '{}' for customerId: {}", request.getName(), customerId);

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        long activeKeyCount = apiKeyRepository.countByCustomerIdAndStatus(customerId, ApiKeyStatus.ACTIVE);
        if (activeKeyCount >= MAX_ACTIVE_KEYS_PER_CUSTOMER) {
            throw new IllegalArgumentException("Maximum active API key limit reached (" + MAX_ACTIVE_KEYS_PER_CUSTOMER + ")");
        }

        // Format: rlaas_<shortCustomerIdHex><dateHex>_<secretEntropy>
        String customerShortHex = customerId.toString().replace("-", "").substring(0, 8);
        String timestampHex = Long.toHexString(Instant.now().getEpochSecond());
        String publicPrefix = "rlaas_" + customerShortHex + timestampHex;

        byte[] randomBytes = new byte[20];
        SECURE_RANDOM.nextBytes(randomBytes);
        String secretEntropy = HexFormat.of().formatHex(randomBytes);

        String rawApiKey = publicPrefix + "_" + secretEntropy;
        String keyHash = hashSha256(rawApiKey);

        ApiKey apiKey = ApiKey.builder()
                .customer(customer)
                .name(request.getName())
                .prefix(publicPrefix)
                .keyHash(keyHash)
                .status(ApiKeyStatus.ACTIVE)
                .expiresAt(request.getExpiresAt())
                .usage(0L)
                .build();

        apiKeyRepository.save(apiKey);
        log.info("API key created with prefix: {}", publicPrefix);

        return ApiKeyCreatedResponse.builder()
                .name(apiKey.getName())
                .rawKey(rawApiKey)
                .expiresAt(apiKey.getExpiresAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiKeyResponse> getApiKeys(UUID customerId) {
        log.info("Fetching API keys for customerId: {}", customerId);
        return apiKeyRepository.findByCustomerId(customerId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ApiKeyResponse getApiKeyById(UUID customerId, UUID keyId) {
        log.info("Fetching API key ID: {} for customerId: {}", keyId, customerId);
        ApiKey apiKey = apiKeyRepository.findByIdAndCustomerId(keyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found with ID: " + keyId));
        return mapToResponse(apiKey);
    }

    @Override
    @Transactional
    public ApiKeyResponse updateApiKeyStatus(UUID customerId, UUID keyId, ApiKeyStatus status) {
        log.info("Updating status of API key ID: {} to {} for customerId: {}", keyId, status, customerId);
        ApiKey apiKey = apiKeyRepository.findByIdAndCustomerId(keyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found with ID: " + keyId));

        apiKey.setStatus(status);
        apiKey.markUpdatedAt();
        ApiKey saved = apiKeyRepository.save(apiKey);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void revokeApiKey(UUID customerId, UUID keyId) {
        log.info("Revoking API key ID: {} for customerId: {}", keyId, customerId);
        ApiKey apiKey = apiKeyRepository.findByIdAndCustomerId(keyId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found with ID: " + keyId));

        apiKey.setStatus(ApiKeyStatus.TERMINATED);
        apiKey.markUpdatedAt();
        apiKeyRepository.save(apiKey);
    }

    @Override
    @Transactional
    public ApiKey validateApiKey(String rawApiKey) {
        if (rawApiKey == null || !rawApiKey.startsWith("rlaas_")) {
            return null;
        }

        int lastUnderscore = rawApiKey.lastIndexOf('_');
        if (lastUnderscore <= 0) {
            return null;
        }

        String prefix = rawApiKey.substring(0, lastUnderscore);
        ApiKey apiKey = apiKeyRepository.findByPrefix(prefix).orElse(null);
        if (apiKey == null || apiKey.getStatus() != ApiKeyStatus.ACTIVE) {
            return null;
        }

        if (apiKey.getExpiresAt() != null && apiKey.getExpiresAt().isBefore(Instant.now())) {
            return null;
        }

        String computedHash = hashSha256(rawApiKey);
        byte[] expectedHashBytes = apiKey.getKeyHash().getBytes(StandardCharsets.UTF_8);
        byte[] actualHashBytes = computedHash.getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedHashBytes, actualHashBytes)) {
            return null;
        }

        // Increment usage and update last_used_at
        apiKey.setUsage(apiKey.getUsage() + 1);
        apiKey.setLastUsedAt(Instant.now());
        apiKey.markUpdatedAt();
        return apiKeyRepository.save(apiKey);
    }

    private String hashSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    private ApiKeyResponse mapToResponse(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .name(apiKey.getName())
                .usage(apiKey.getUsage())
                .status(apiKey.getStatus())
                .expiresAt(apiKey.getExpiresAt())
                .createdAt(apiKey.getCreatedAt())
                .updatedAt(apiKey.getUpdatedAt())
                .build();
    }
}
