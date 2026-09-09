package com.project.limiter.service;

import com.project.limiter.dto.request.LoginRequest;
import com.project.limiter.dto.request.OtpRequestDto;
import com.project.limiter.dto.request.PasswordResetRequest;
import com.project.limiter.dto.request.RegisterRequest;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.dto.response.LoginResponse;

public interface SecurityService {

    CustomerResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    void generatePasswordOtp(OtpRequestDto request);

    void resetPassword(PasswordResetRequest request);

    void logout(String token);
}
