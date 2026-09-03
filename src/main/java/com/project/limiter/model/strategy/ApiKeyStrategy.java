package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;

@JsonTypeName("API_KEY")
@Getter
@Setter
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApiKeyStrategy implements KeyStrategyConfig {

    @Override
    public String resolveKey(RateLimitContext ctx) {
        return ctx != null && ctx.getApiKey() != null ? "key:" + ctx.getApiKey() : "key:none";
    }
}
