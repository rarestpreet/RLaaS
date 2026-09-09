package com.project.limiter.service;

import com.project.limiter.dto.request.UpdateCustomerRequest;
import com.project.limiter.dto.response.CustomerResponse;

import java.util.UUID;

public interface CustomerService {

    CustomerResponse getCustomerProfile(UUID id);

    CustomerResponse updateCustomer(UUID id, UpdateCustomerRequest request);

    void deleteCustomer(UUID id);
}
