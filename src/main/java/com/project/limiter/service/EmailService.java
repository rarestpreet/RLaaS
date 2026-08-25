package com.project.limiter.service;

public interface EmailService {

    void sendPassResetEmail(String toEmail, String otp);

}
