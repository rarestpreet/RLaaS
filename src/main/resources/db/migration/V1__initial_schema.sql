-- V1__initial_schema.sql
-- Flyway initial migration script for Distributed Rate Limiter SaaS (RLaaS)

-- 1. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);

-- 2. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_projects_customer_id_name UNIQUE (customer_id, name)
);

CREATE INDEX idx_projects_customer_id ON projects(customer_id);

-- 3. API Keys Table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES customers(id),
    prefix VARCHAR(32) NOT NULL UNIQUE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    usage BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_client_id ON api_keys(client_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);

-- 4. Rate Limit Policies Table
CREATE TABLE rate_limit_policies (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(150) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    limiter_type VARCHAR(40) NOT NULL,
    key_strategies JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_rate_limit_policies_project_id_name UNIQUE (project_id, name)
);

CREATE INDEX idx_rate_limit_policies_project_id ON rate_limit_policies(project_id);
CREATE INDEX idx_rate_limit_policies_endpoint ON rate_limit_policies(endpoint);
CREATE INDEX idx_rate_limit_policies_limiter_type ON rate_limit_policies(limiter_type);
CREATE INDEX idx_rate_limit_policies_status ON rate_limit_policies(status);

-- 5. Limiter Configs Table
CREATE TABLE limiter_configs (
    id UUID PRIMARY KEY,
    policy_id UUID NOT NULL UNIQUE REFERENCES rate_limit_policies(id),
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_limiter_configs_policy_id ON limiter_configs(policy_id);
