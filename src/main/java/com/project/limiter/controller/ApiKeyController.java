package com.project.limiter.controller;

import com.project.limiter.dto.request.CreateApiKeyRequest;
import com.project.limiter.dto.response.ApiKeyCreatedResponse;
import com.project.limiter.dto.response.ApiKeyResponse;
import com.project.limiter.model.enums.ApiKeyStatus;
import com.project.limiter.security.CustomerUserDetails;
import com.project.limiter.service.ApiKeyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    public ResponseEntity<ApiKeyCreatedResponse> createApiKey(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @Valid @RequestBody CreateApiKeyRequest request) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(apiKeyService.createApiKey(customerId, request));
    }

    @GetMapping
    public ResponseEntity<List<ApiKeyResponse>> getApiKeys(
            @AuthenticationPrincipal CustomerUserDetails principal) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(apiKeyService.getApiKeys(customerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiKeyResponse> getApiKeyById(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(apiKeyService.getApiKeyById(customerId, id));
    }

    @PatchMapping(value = "/{id}/status")
    public ResponseEntity<ApiKeyResponse> updateApiKeyStatus(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id,
            @RequestParam ApiKeyStatus status) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(apiKeyService.updateApiKeyStatus(customerId, id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeApiKey(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id) {
        UUID customerId = principal.getCustomer().getId();
        apiKeyService.revokeApiKey(customerId, id);
        return ResponseEntity.noContent().build();
    }
}
