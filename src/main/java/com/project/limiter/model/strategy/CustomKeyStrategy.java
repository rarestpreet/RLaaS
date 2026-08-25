package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;

@JsonTypeName("CUSTOM")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomKeyStrategy implements KeyStrategyConfig {

    private String headerName;

    @Override
    public String resolveKey(RateLimitContext ctx) {
        if (ctx == null || ctx.getCustomHeaders() == null || headerName == null) {
            return "custom:unknown";
        }
        String val = ctx.getCustomHeaders().get(headerName);
        return val != null ? "custom:" + headerName + ":" + val : "custom:" + headerName + ":none";
    }
}
