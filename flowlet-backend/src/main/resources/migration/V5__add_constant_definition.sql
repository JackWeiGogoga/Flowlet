CREATE TABLE IF NOT EXISTS constant_definition (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    value_type VARCHAR(20) NOT NULL,
    value_json TEXT,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flow_definition(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_constant_definition_project ON constant_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_constant_definition_flow ON constant_definition(flow_id);
CREATE INDEX IF NOT EXISTS idx_constant_definition_name ON constant_definition(project_id, flow_id, name);
