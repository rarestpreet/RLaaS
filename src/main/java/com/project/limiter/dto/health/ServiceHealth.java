package com.project.limiter.dto.health;

import com.project.limiter.model.enums.ServiceName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceHealth {
    private ServiceName serviceName;
    private boolean healthy;
    private String status; // "UP", "DOWN", "OUT_OF_SERVICE"
    private Instant lastCheckedAt;
    private long latencyMs;
    private String errorDetails;
}
