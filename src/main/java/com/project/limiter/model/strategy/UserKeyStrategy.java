package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;

@JsonTypeName("USER")
@Getter
@Setter
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserKeyStrategy implements KeyStrategyConfig {

    @Override
    public String resolveKey(RateLimitContext ctx) {
        return ctx != null && ctx.getUserId() != null ? "user:" + ctx.getUserId() : "user:anonymous";
    }
}
