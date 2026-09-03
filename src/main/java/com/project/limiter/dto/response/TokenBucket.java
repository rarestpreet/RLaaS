package com.project.limiter.dto.response;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenBucket {

    private long remainingRequestCount;
    private long lastRefilledAt;

}
