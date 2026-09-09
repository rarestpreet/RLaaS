package com.project.limiter.controller;

import com.project.limiter.dto.request.CreateProjectRequest;
import com.project.limiter.dto.request.UpdateProjectRequest;
import com.project.limiter.dto.response.ProjectResponse;
import com.project.limiter.security.CustomerUserDetails;
import com.project.limiter.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @Valid @RequestBody CreateProjectRequest request) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(customerId, request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getProjects(
            @AuthenticationPrincipal CustomerUserDetails principal) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(projectService.getProjects(customerId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProjectById(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID projectId) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(projectService.getProjectById(customerId, projectId));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(projectService.updateProject(customerId, projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID projectId) {
        UUID customerId = principal.getCustomer().getId();
        projectService.deleteProject(customerId, projectId);
        return ResponseEntity.noContent().build();
    }
}
