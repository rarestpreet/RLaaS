package com.project.limiter.exception;

import com.project.limiter.dto.response.Decision;
import lombok.Getter;

@Getter
public class RateLimitExceededException extends RuntimeException {

    private final Decision decision;

    public RateLimitExceededException(String message) {
        super(message);
        this.decision = null;
    }

    public RateLimitExceededException(String message, Decision decision) {
        super(message);
        this.decision = decision;
    }
}
