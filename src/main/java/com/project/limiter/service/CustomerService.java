package com.project.limiter.service;

import com.project.limiter.dto.request.*;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.dto.response.LoginResponse;

import java.util.UUID;

public interface CustomerService {

    CustomerResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    void generatePasswordOtp(OtpRequestDto request);

    void resetPassword(PasswordResetRequest request);

    CustomerResponse updateCustomer(UUID id, UpdateCustomerRequest request);

    void deleteCustomer(UUID id);

    void logout(String token);
}
