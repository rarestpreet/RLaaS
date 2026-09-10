package com.project.limiter.service;

import com.project.limiter.dto.request.CreateApiKeyRequest;
import com.project.limiter.dto.response.ApiKeyCreatedResponse;
import com.project.limiter.dto.response.ApiKeyResponse;
import com.project.limiter.model.ApiKey;
import com.project.limiter.model.enums.ApiKeyStatus;

import java.util.List;
import java.util.UUID;

public interface ApiKeyService {

    ApiKeyCreatedResponse createApiKey(UUID customerId, CreateApiKeyRequest request);

    List<ApiKeyResponse> getApiKeys(UUID customerId);

    ApiKeyResponse getApiKeyById(UUID customerId, UUID keyId);

    ApiKeyResponse updateApiKeyStatus(UUID customerId, UUID keyId, ApiKeyStatus status);

    void revokeApiKey(UUID customerId, UUID keyId);

    ApiKey validateApiKey(String rawApiKey);
}
