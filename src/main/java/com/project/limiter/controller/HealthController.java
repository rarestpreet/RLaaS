package com.project.limiter.controller;

import com.project.limiter.dto.health.ServiceHealth;
import com.project.limiter.model.enums.ServiceName;
import com.project.limiter.service.ServiceHealthRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final ServiceHealthRegistry serviceHealthRegistry;

    /**
     * Fetch health status.
     * Uses query param 'serviceName' to fetch health of the requested service.
     * If omitted, returns health map for all services.
     *
     * Example:
     *   GET /health?serviceName=REDIS
     *   GET /health?serviceName=DATABASE
     *   GET /health
     */
    @GetMapping
    public ResponseEntity<?> getHealth(
            @RequestParam(name = "serviceName", required = false) String serviceName,
            @RequestParam(name = "service", required = false) String serviceAlt
    ) {
        String query = serviceName != null ? serviceName : serviceAlt;
        if (query != null && !query.isBlank()) {
            try {
                ServiceName enumVal = ServiceName.valueOf(query.trim().toUpperCase());
                return ResponseEntity.ok(serviceHealthRegistry.getHealth(enumVal));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Unknown service name: '" + query + "'",
                        "validServices", ServiceName.values()
                ));
            }
        }
        return ResponseEntity.ok(serviceHealthRegistry.getAllHealth());
    }

    // Retained for backward-compatibility
    @GetMapping("/redis")
    public ResponseEntity<ServiceHealth> getRedisHealth() {
        return ResponseEntity.ok(serviceHealthRegistry.getHealth(ServiceName.REDIS));
    }

    @GetMapping("/services")
    public ResponseEntity<Map<ServiceName, ServiceHealth>> getAllServicesHealth() {
        return ResponseEntity.ok(serviceHealthRegistry.getAllHealth());
    }
}
