package com.project.limiter.service.impl;

import com.project.limiter.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    public void sendPassResetEmail(String toEmail, String otp) {
        log.info("Sending password reset OTP email to: {}", toEmail);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Your password reset code");
            message.setText("Your OTP for password reset is: " + otp + "\nThis code is valid for 5 minutes.");
            mailSender.send(message);
            log.info("Password reset OTP email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            // Do not fail execution if mail server is unconfigured in dev/local environment
        }
    }
}
