package com.project.limiter.model.strategy;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = UserKeyStrategy.class, name = "USER"),
    @JsonSubTypes.Type(value = IpKeyStrategy.class, name = "IP"),
    @JsonSubTypes.Type(value = ApiKeyStrategy.class, name = "API_KEY"),
    @JsonSubTypes.Type(value = CustomKeyStrategy.class, name = "CUSTOM"),
    @JsonSubTypes.Type(value = CompositeKeyStrategy.class, name = "COMPOSITE")
})
public interface KeyStrategyConfig {
    String resolveKey(RateLimitContext ctx);
}
