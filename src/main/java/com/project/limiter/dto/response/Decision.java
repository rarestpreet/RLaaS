package com.project.limiter.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Decision {
    private boolean allowed;
    private long remaining;
    private long cooldownPeriod;
}
