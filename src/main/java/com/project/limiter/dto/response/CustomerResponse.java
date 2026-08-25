package com.project.limiter.dto.response;

import com.project.limiter.model.enums.CustomerAccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {
    private UUID id;
    private String name;
    private String email;
    private CustomerAccountStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
