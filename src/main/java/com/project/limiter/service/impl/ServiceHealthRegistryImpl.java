package com.project.limiter.service.impl;

import com.project.limiter.dto.health.ServiceHealth;
import com.project.limiter.model.enums.ServiceName;
import com.project.limiter.service.ServiceHealthRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.CompositeHealth;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceHealthRegistryImpl implements ServiceHealthRegistry {

    private final HealthEndpoint healthEndpoint;
    private final RedisConnectionFactory redisConnectionFactory;
    private final DataSource dataSource;

    private final Map<ServiceName, ServiceHealth> healthStatusMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("Initializing ServiceHealthRegistry...");
        // Initialize with default states
        healthStatusMap.put(ServiceName.REDIS, ServiceHealth.builder()
                .serviceName(ServiceName.REDIS)
                .healthy(true)
                .status("UP")
                .lastCheckedAt(Instant.now())
                .latencyMs(0)
                .build());

        healthStatusMap.put(ServiceName.DATABASE, ServiceHealth.builder()
                .serviceName(ServiceName.DATABASE)
                .healthy(true)
                .status("UP")
                .lastCheckedAt(Instant.now())
                .latencyMs(0)
                .build());

        healthStatusMap.put(ServiceName.MAIL, ServiceHealth.builder()
                .serviceName(ServiceName.MAIL)
                .healthy(true)
                .status("UP")
                .lastCheckedAt(Instant.now())
                .latencyMs(0)
                .build());

        // Perform immediate health evaluation on startup
        checkAllServicesHealth();
    }

    @Override
    public boolean isServiceUp(ServiceName service) {
        ServiceHealth health = healthStatusMap.get(service);
        return health != null && health.isHealthy();
    }

    @Override
    public ServiceHealth getHealth(ServiceName service) {
        return healthStatusMap.get(service);
    }

    @Override
    public Map<ServiceName, ServiceHealth> getAllHealth() {
        return Collections.unmodifiableMap(healthStatusMap);
    }

    @Override
    public void recordFailure(ServiceName service, String reason) {
        ServiceHealth existing = healthStatusMap.get(service);
        boolean wasUp = existing == null || existing.isHealthy();

        ServiceHealth updated = ServiceHealth.builder()
                .serviceName(service)
                .healthy(false)
                .status("DOWN")
                .lastCheckedAt(Instant.now())
                .latencyMs(existing != null ? existing.getLatencyMs() : 0)
                .errorDetails(reason)
                .build();

        healthStatusMap.put(service, updated);

        if (wasUp) {
            log.warn("Circuit Breaker: Service {} marked DOWN immediately due to runtime failure: {}", service, reason);
        }
    }

    @Override
    public void recordSuccess(ServiceName service, long latencyMs) {
        ServiceHealth existing = healthStatusMap.get(service);
        boolean wasDown = existing != null && !existing.isHealthy();

        ServiceHealth updated = ServiceHealth.builder()
                .serviceName(service)
                .healthy(true)
                .status("UP")
                .lastCheckedAt(Instant.now())
                .latencyMs(latencyMs)
                .errorDetails(null)
                .build();

        healthStatusMap.put(service, updated);

        if (wasDown) {
            log.info("Service {} recovered and marked UP. Latency: {}ms", service, latencyMs);
        }
    }

    /**
     * Scheduled background poll every 12 seconds (within 10-15s window).
     * Polls Actuator health and checks services directly if needed.
     */
    @Override
    @Scheduled(fixedRate = 12000)
    public void checkAllServicesHealth() {
        checkRedisHealth();
        checkDatabaseHealth();
        checkMailHealthFromActuator();
    }

    private void checkRedisHealth() {
        long start = System.currentTimeMillis();
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            String ping = connection.ping();
            long latency = Math.max(1, System.currentTimeMillis() - start);
            if ("PONG".equalsIgnoreCase(ping)) {
                recordSuccess(ServiceName.REDIS, latency);
            } else {
                recordFailure(ServiceName.REDIS, "Unexpected Redis PING response: " + ping);
            }
        } catch (Exception ex) {
            recordFailure(ServiceName.REDIS, ex.getMessage());
        }
    }

    private void checkDatabaseHealth() {
        long start = System.currentTimeMillis();
        try {
            HealthComponent health = healthEndpoint.health();
            if (health instanceof CompositeHealth compositeHealth) {
                HealthComponent dbComponent = compositeHealth.getComponents().get("db");
                if (dbComponent != null) {
                    boolean isUp = Status.UP.equals(dbComponent.getStatus());
                    long latency = System.currentTimeMillis() - start;
                    if (isUp) {
                        recordSuccess(ServiceName.DATABASE, latency);
                    } else {
                        recordFailure(ServiceName.DATABASE, "Actuator reported DB status: " + dbComponent.getStatus());
                    }
                    return;
                }
            }

            // Direct JDBC validation check
            try (Connection conn = dataSource.getConnection()) {
                boolean valid = conn.isValid(1);
                long latency = System.currentTimeMillis() - start;
                if (valid) {
                    recordSuccess(ServiceName.DATABASE, latency);
                } else {
                    recordFailure(ServiceName.DATABASE, "Database connection validation failed");
                }
            }
        } catch (Exception ex) {
            recordFailure(ServiceName.DATABASE, ex.getMessage());
        }
    }

    private void checkMailHealthFromActuator() {
        long start = System.currentTimeMillis();
        try {
            HealthComponent health = healthEndpoint.health();
            if (health instanceof CompositeHealth compositeHealth) {
                HealthComponent mailComponent = compositeHealth.getComponents().get("mail");
                if (mailComponent != null) {
                    boolean isUp = Status.UP.equals(mailComponent.getStatus());
                    long latency = System.currentTimeMillis() - start;
                    if (isUp) {
                        recordSuccess(ServiceName.MAIL, latency);
                    } else {
                        recordFailure(ServiceName.MAIL, "Actuator reported Mail status: " + mailComponent.getStatus());
                    }
                    return;
                }
            }
            // Default UP if not explicitly configured in Actuator
            recordSuccess(ServiceName.MAIL, System.currentTimeMillis() - start);
        } catch (Exception ex) {
            recordFailure(ServiceName.MAIL, ex.getMessage());
        }
    }
}
