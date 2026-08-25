package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@JsonTypeName("COMPOSITE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class CompositeKeyStrategy implements KeyStrategyConfig {

    @Builder.Default
    private List<KeyStrategyConfig> strategies = new ArrayList<>();

    @Override
    public String resolveKey(RateLimitContext ctx) {
        if (strategies == null || strategies.isEmpty()) {
            return "composite:empty";
        }
        return strategies.stream()
                .map(s -> s.resolveKey(ctx))
                .collect(Collectors.joining(":"));
    }
}
