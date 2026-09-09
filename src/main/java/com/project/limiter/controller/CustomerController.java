package com.project.limiter.controller;

import com.project.limiter.dto.request.UpdateCustomerRequest;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.exception.ResourceNotFoundException;
import com.project.limiter.security.CustomerUserDetails;
import com.project.limiter.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    /**
     * Get the authenticated customer's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<CustomerResponse> getCurrentCustomer(
            @AuthenticationPrincipal CustomerUserDetails principal) {
        UUID customerId = principal.getCustomer().getId();
        return ResponseEntity.ok(customerService.getCustomerProfile(customerId));
    }

    /**
     * Get customer profile by ID (scoped to ensure customer A cannot view customer B).
     */
    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> getCustomerById(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id) {
        validateCustomerOwnership(principal, id);
        return ResponseEntity.ok(customerService.getCustomerProfile(id));
    }

    /**
     * Update customer profile (scoped to ensure customer A cannot modify customer B).
     */
    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        validateCustomerOwnership(principal, id);
        CustomerResponse response = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Terminate customer account (scoped to ensure customer A cannot delete customer B).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCustomer(
            @AuthenticationPrincipal CustomerUserDetails principal,
            @PathVariable UUID id) {
        validateCustomerOwnership(principal, id);
        customerService.deleteCustomer(id);
        return ResponseEntity.ok("Customer account terminated successfully");
    }

    private void validateCustomerOwnership(CustomerUserDetails principal, UUID requestedId) {
        if (principal == null || !principal.getCustomer().getId().equals(requestedId)) {
            throw new ResourceNotFoundException("Customer not found with ID: " + requestedId);
        }
    }
}
