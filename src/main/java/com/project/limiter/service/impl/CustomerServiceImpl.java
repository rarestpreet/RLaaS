package com.project.limiter.service.impl;

import com.project.limiter.dto.request.UpdateCustomerRequest;
import com.project.limiter.dto.response.CustomerResponse;
import com.project.limiter.exception.EmailAlreadyExistException;
import com.project.limiter.exception.UserNotFoundException;
import com.project.limiter.model.Customer;
import com.project.limiter.model.enums.CustomerAccountStatus;
import com.project.limiter.repository.CustomerRepository;
import com.project.limiter.service.CustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    public CustomerResponse getCustomerProfile(UUID id) {
        log.info("Fetching customer profile for ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Customer not found with ID: " + id));

        return mapToCustomerResponse(customer);
    }

    @Override
    public CustomerResponse updateCustomer(UUID id, UpdateCustomerRequest request) {
        log.info("Updating customer profile for ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Customer not found with ID: " + id));

        if (!customer.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (customerRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new EmailAlreadyExistException("Email " + request.getEmail() + " is already taken");
            }
        }

        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.markUpdatedAt();
        Customer savedCustomer = customerRepository.save(customer);
        return mapToCustomerResponse(savedCustomer);
    }

    @Override
    public void deleteCustomer(UUID id) {
        log.info("Soft-deleting customer account for ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Customer not found with ID: " + id));

        customer.setStatus(CustomerAccountStatus.TERMINATED);
        customer.markUpdatedAt();
        customerRepository.save(customer);
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
