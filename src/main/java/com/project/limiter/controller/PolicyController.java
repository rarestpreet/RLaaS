package com.project.limiter.controller;

import com.project.limiter.dto.request.CreatePolicyRequest;
import com.project.limiter.dto.request.UpdatePolicyRequest;
import com.project.limiter.dto.response.PolicyResponse;
import com.project.limiter.model.enums.PolicyStatus;
import com.project.limiter.security.CustomerUserDetails;
import com.project.limiter.service.PolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    @PostMapping("/projects/{projectId}/policies")
    public ResponseEntity<PolicyResponse> createPolicy(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreatePolicyRequest request) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(policyService.createPolicy(customerId, projectId, request));
    }

    @GetMapping("/projects/{projectId}/policies")
    public ResponseEntity<List<PolicyResponse>> getPoliciesByProject(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID projectId) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(policyService.getPoliciesByProject(customerId, projectId));
    }

    /**
     * Get a single policy by ID using query parameter.
     * Accessible via:
     * - GET /policies?policyId={id}
     * - GET /projects/{projectId}/policies?policyId={id}
     */
    @GetMapping(value = {"/policies", "/projects/{projectId}/policies"}, params = "policyId")
    public ResponseEntity<PolicyResponse> getPolicyById(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @RequestParam UUID policyId) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(policyService.getPolicyById(customerId, policyId));
    }

    /**
     * Full update of a policy using query parameter.
     * Accessible via:
     * - PUT /policies?policyId={id}
     * - PUT /projects/{projectId}/policies?policyId={id}
     */
    @PutMapping(value = {"/policies", "/projects/{projectId}/policies"}, params = "policyId")
    public ResponseEntity<PolicyResponse> updatePolicy(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @RequestParam UUID policyId,
            @Valid @RequestBody UpdatePolicyRequest request) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(policyService.updatePolicy(customerId, policyId, request));
    }

    /**
     * Patch-style status toggle using query parameter:
     * - PATCH /policies/status?policyId={id}&status={status}
     * - PATCH /projects/{projectId}/policies/status?policyId={id}&status={status}
     */
    @PatchMapping(value = {"/policies/status", "/projects/{projectId}/policies/status"}, params = "policyId")
    public ResponseEntity<PolicyResponse> updatePolicyStatus(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @RequestParam UUID policyId,
            @RequestParam PolicyStatus status) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(policyService.updatePolicyStatus(customerId, policyId, status));
    }

    /**
     * Soft-delete a policy using query parameter:
     * - DELETE /policies?policyId={id}
     * - DELETE /projects/{projectId}/policies?policyId={id}
     */
    @DeleteMapping(value = {"/policies", "/projects/{projectId}/policies"}, params = "policyId")
    public ResponseEntity<Void> deletePolicy(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @RequestParam UUID policyId) {
        UUID customerId = principal.getCustomer().getId();
        policyService.deletePolicy(customerId, policyId);
        return ResponseEntity.noContent().build();
    }
}
