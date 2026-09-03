package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;

@JsonTypeName("IP")
@Getter
@Setter
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class IpKeyStrategy implements KeyStrategyConfig {

    @Override
    public String resolveKey(RateLimitContext ctx) {
        return ctx != null && ctx.getClientIp() != null ? "ip:" + ctx.getClientIp() : "ip:unknown";
    }
}
