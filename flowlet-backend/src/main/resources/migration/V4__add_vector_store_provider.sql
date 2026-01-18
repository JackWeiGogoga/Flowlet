CREATE TABLE IF NOT EXISTS vector_store_provider (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    provider_key VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    base_url TEXT NOT NULL,
    api_key_encrypted TEXT,
    config_json TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vector_store_provider_tenant ON vector_store_provider(tenant_id);
