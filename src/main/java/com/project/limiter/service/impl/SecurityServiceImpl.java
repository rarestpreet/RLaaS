package com.project.limiter.service.impl;

import com.project.limiter.dto.request.LoginRequest;
import com.project.limiter.dto.request.OtpRequestDto;
import com.project.limiter.dto.request.PasswordResetRequest;
import com.project.limiter.dto.request.RegisterRequest;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.dto.response.LoginResponse;
import com.project.limiter.exception.BadCredentialsException;
import com.project.limiter.exception.EmailAlreadyExistException;
import com.project.limiter.exception.InvalidOtpException;
import com.project.limiter.exception.UserNotFoundException;
import com.project.limiter.model.Customer;
import com.project.limiter.model.enums.CustomerAccountStatus;
import com.project.limiter.repository.CustomerRepository;
import com.project.limiter.service.EmailService;
import com.project.limiter.service.SecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityServiceImpl implements SecurityService {

    private final CustomerRepository customerRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final Duration SESSION_TTL = Duration.ofHours(4);
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public CustomerResponse register(RegisterRequest request) {
        log.info("Registering new customer with email: {}", request.getEmail());
        if (customerRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new EmailAlreadyExistException("Email " + request.getEmail() + " is already registered");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        Customer customer = Customer.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(hashedPassword)
                .status(CustomerAccountStatus.ACTIVE)
                .build();

        Customer saved = customerRepository.save(customer);
        return mapToCustomerResponse(saved);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("Customer login attempt for email: {}", request.getEmail());
        Customer customer = customerRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (customer.getStatus() != CustomerAccountStatus.ACTIVE) {
            throw new BadCredentialsException("Account is not active");
        }

        if (!passwordEncoder.matches(request.getPassword(), customer.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = UUID.randomUUID().toString();
        String sessionKey = "session:" + token;
        redisTemplate.opsForValue().set(sessionKey, customer.getId().toString(), SESSION_TTL);

        return LoginResponse.builder()
                .token(token)
                .customerId(customer.getId())
                .email(customer.getEmail())
                .name(customer.getName())
                .build();
    }

    @Override
    public void generatePasswordOtp(OtpRequestDto request) {
        log.info("Generating password reset OTP for email: {}", request.getEmail());
        Customer customer = customerRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException("Customer not found with email: " + request.getEmail()));

        if (customer.getStatus() == CustomerAccountStatus.TERMINATED) {
            throw new UserNotFoundException("Customer account is terminated");
        }

        String otp = String.format("%06d", RANDOM.nextInt(1000000));
        String otpKey = "otp:" + request.getEmail();
        redisTemplate.opsForValue().set(otpKey, otp, OTP_TTL);

        emailService.sendPassResetEmail(request.getEmail(), otp);
    }

    @Override
    public void resetPassword(PasswordResetRequest request) {
        log.info("Resetting password for email: {}", request.getEmail());
        Customer customer = customerRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException("Customer not found with email: " + request.getEmail()));

        String otpKey = "otp:" + request.getEmail();
        Object storedOtp = redisTemplate.opsForValue().get(otpKey);

        if (storedOtp == null || !storedOtp.toString().equals(request.getOtp())) {
            throw new InvalidOtpException("Invalid or expired OTP");
        }

        redisTemplate.delete(otpKey);

        String newHashedPassword = passwordEncoder.encode(request.getNewPassword());
        customer.setPassword(newHashedPassword);
        customer.markUpdatedAt();
        customerRepository.save(customer);
    }

    @Override
    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
        }
        log.info("Logging out customer session for token: {}", token);
        String sessionKey = "session:" + token;
        redisTemplate.delete(sessionKey);
    }

    private CustomerResponse mapToCustomerResponse(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .email(customer.getEmail())
                .status(customer.getStatus())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }
}
