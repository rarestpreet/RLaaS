package com.project.limiter.controller;

import com.project.limiter.dto.request.LoginRequest;
import com.project.limiter.dto.request.OtpRequestDto;
import com.project.limiter.dto.request.PasswordResetRequest;
import com.project.limiter.dto.request.RegisterRequest;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.dto.response.LoginResponse;
import com.project.limiter.service.SecurityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

@RestController
@RequiredArgsConstructor
public class SecurityController {

    private final SecurityService securityService;

    @PostMapping({"/auth/register", "/customers/register"})
    public ResponseEntity<CustomerResponse> register(@Valid @RequestBody RegisterRequest request) {
        CustomerResponse response = securityService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/auth/login", "/customers/login"})
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = securityService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/auth/password-otp-generate", "/customers/password-otp-generate"})
    public ResponseEntity<String> generatePasswordOtp(@Valid @RequestBody OtpRequestDto request) {
        securityService.generatePasswordOtp(request);
        return ResponseEntity.ok("OTP sent successfully to email");
    }

    @PostMapping({"/auth/password-reset", "/customers/password-reset"})
    public ResponseEntity<String> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        securityService.resetPassword(request);
        return ResponseEntity.ok("Password reset successfully");
    }

    @PostMapping({"/auth/logout", "/customers/logout"})
    public ResponseEntity<String> logout(@RequestHeader(value = AUTHORIZATION, required = false) String authHeader) {
        if (authHeader != null && !authHeader.isBlank()) {
            securityService.logout(authHeader);
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok("Customer logged out successfully");
    }
}
