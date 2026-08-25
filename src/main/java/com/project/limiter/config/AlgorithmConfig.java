package com.project.limiter.config;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.DEDUCTION)
@JsonSubTypes({
    @JsonSubTypes.Type(value = TokenBucketConfig.class),
    @JsonSubTypes.Type(value = AnchoredWindowConfig.class)
})
public sealed interface AlgorithmConfig permits TokenBucketConfig, AnchoredWindowConfig {
}
