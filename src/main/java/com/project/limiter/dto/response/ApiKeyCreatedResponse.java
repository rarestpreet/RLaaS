package com.project.limiter.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyCreatedResponse {

    private UUID id;
    private String name;
    private String rawKey;
    private String prefix;
    private Instant expiresAt;
}
