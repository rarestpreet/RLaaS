package com.project.limiter.dto.response;

import com.project.limiter.model.enums.ApiKeyStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyResponse {

    private UUID id;
    private String name;
    private String prefix;
    private Long usage;
    private ApiKeyStatus status;
    private Instant expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
