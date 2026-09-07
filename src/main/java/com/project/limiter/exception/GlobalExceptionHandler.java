package com.project.limiter.exception;

import com.project.limiter.dto.response.Decision;
import com.project.limiter.dto.response.ExceptionResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.ConstraintViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ExceptionResponseDTO> handleUserNotFoundException(UserNotFoundException ex) {
        log.warn("User not found: {}", ex.getMessage());
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.NOT_FOUND.value())
                .error("User not found")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(EmailAlreadyExistException.class)
    public ResponseEntity<ExceptionResponseDTO> handleEmailAlreadyExistException(EmailAlreadyExistException ex) {
        log.warn("Email already exists: {}", ex.getMessage());
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.CONFLICT.value())
                .error("Email already exists")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<ExceptionResponseDTO> handleInvalidOtpException(InvalidOtpException ex) {
        log.warn("Invalid OTP received: {}", ex.getMessage());
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Invalid OTP")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ExceptionResponseDTO> handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Bad credentials: {}", ex.getMessage());
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Bad credentials")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(TokenInvalidException.class)
    public ResponseEntity<ExceptionResponseDTO> handleTokenInvalidException(TokenInvalidException ex) {
        log.warn("Token invalid: {}", ex.getMessage());
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Token invalid")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ExceptionResponseDTO> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("Validation failed: {}", ex.getMessage());
        List<List<String>> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> List.of(error.getField(), error.getDefaultMessage()))
                .toList();

        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation failed")
                .message("Invalid input received")
                .fieldErrors(fieldErrors)
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ExceptionResponseDTO> handleConstraintViolationException(ConstraintViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMessage());
        List<List<String>> fieldErrors = ex.getConstraintViolations().stream()
                .map(v -> List.of(v.getPropertyPath().toString(), v.getMessage()))
                .toList();

        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation failed")
                .message("Invalid input received")
                .fieldErrors(fieldErrors)
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ExceptionResponseDTO> handleRateLimitExceededException(RateLimitExceededException ex) {
        log.warn("Rate limit exceeded: {}", ex.getMessage());

        String message = ex.getMessage();
        HttpHeaders headers = new HttpHeaders();

        if (ex.getDecision() != null) {
            Decision decision = ex.getDecision();
            long cooldownMs = decision.getCooldownPeriod();
            long retryAfterSeconds = (long) Math.ceil(cooldownMs / 1000.0);
            if (retryAfterSeconds > 0) {
                headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
            }
            message = "%s (cooldown: %d ms, remaining: %d)".formatted(
                    ex.getMessage(),
                    decision.getCooldownPeriod(),
                    decision.getRemaining()
            );
        }

        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error("Too Many Requests")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).headers(headers).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExceptionResponseDTO> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        ExceptionResponseDTO response = ExceptionResponseDTO.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
