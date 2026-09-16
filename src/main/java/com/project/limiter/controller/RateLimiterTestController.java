package com.project.limiter.controller;

import com.project.limiter.dto.request.RateLimitTestRequest;
import com.project.limiter.dto.response.Decision;
import com.project.limiter.service.RateLimiterTestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test/rate-limit")
@RequiredArgsConstructor
public class RateLimiterTestController {

    private final RateLimiterTestService rateLimiterTestService;

    @PostMapping("/check")
    public ResponseEntity<Decision> checkRateLimit(
            @Valid @RequestBody RateLimitTestRequest request,
            HttpServletRequest servletRequest) {

        String clientIp = extractClientIp(servletRequest);
        Decision decision = rateLimiterTestService.checkFreeRateLimit(request, clientIp);
        return ResponseEntity.ok(decision);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr() != null ? request.getRemoteAddr() : "anonymous";
        }
        return xfHeader.split(",")[0].trim();
    }
}
