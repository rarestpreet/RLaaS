package com.project.limiter.service;

import com.project.limiter.dto.health.ServiceHealth;
import com.project.limiter.model.enums.ServiceName;

import java.util.Map;

public interface ServiceHealthRegistry {

    boolean isServiceUp(ServiceName service);

    ServiceHealth getHealth(ServiceName service);

    Map<ServiceName, ServiceHealth> getAllHealth();

    void recordFailure(ServiceName service, String reason);

    void recordSuccess(ServiceName service, long latencyMs);

    void checkAllServicesHealth();
}
