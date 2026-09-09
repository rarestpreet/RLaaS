package com.project.limiter.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 150, message = "Project name must not exceed 150 characters")
    private String name;
}
