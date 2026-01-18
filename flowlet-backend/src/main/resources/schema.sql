-- 流程定义表
CREATE TABLE IF NOT EXISTS flow_definition (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),            -- 所属项目
    name VARCHAR(255) NOT NULL,
    description TEXT,
    graph_data TEXT NOT NULL,  -- 存储流程图的 JSON 数据
    input_schema TEXT,         -- 输入参数的 JSON Schema
    status VARCHAR(20) DEFAULT 'draft',  -- draft, published, disabled
    version INTEGER DEFAULT 0,
    is_reusable BOOLEAN DEFAULT FALSE,  -- 是否为公共流程（可被其他流程调用）
    call_count INTEGER DEFAULT 0,       -- 被调用次数统计
    created_by VARCHAR(36),             -- 创建人ID
    created_by_name VARCHAR(255),       -- 创建人用户名
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 流程定义版本表（发布快照）
CREATE TABLE IF NOT EXISTS flow_definition_version (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    graph_data TEXT NOT NULL,
    input_schema TEXT,
    created_by VARCHAR(36),
    created_by_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, version),
    FOREIGN KEY (flow_id) REFERENCES flow_definition(id)
);

-- 流程执行实例表
CREATE TABLE IF NOT EXISTS flow_execution (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),            -- 所属项目
    flow_id VARCHAR(36) NOT NULL,
    flow_version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,  -- pending, running, paused, completed, failed
    input_data TEXT,              -- 输入数据 JSON
    output_data TEXT,             -- 输出数据 JSON
    context_data TEXT,            -- 执行上下文数据 JSON
    current_node_id VARCHAR(100),
    error_message TEXT,
    parent_execution_id VARCHAR(36),      -- 父执行实例ID（如果是子流程执行）
    parent_node_execution_id VARCHAR(36), -- 父节点执行ID
    call_chain TEXT,                      -- 调用链路追踪（JSON数组）
    triggered_by VARCHAR(36),             -- 触发人
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- 注意：移除外键约束，因为调试模式的流程定义用 debug 状态标识
);

-- 节点执行记录表
CREATE TABLE IF NOT EXISTS node_execution (
    id VARCHAR(36) PRIMARY KEY,
    execution_id VARCHAR(36) NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    node_name VARCHAR(255),
    status VARCHAR(20) NOT NULL,  -- pending, running, waiting_callback, completed, failed, skipped
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    execution_data TEXT,  -- 执行过程数据，用于记录中间信息（如请求/响应、发送的消息等）
    retry_count INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES flow_execution(id)
);

-- 异步回调记录表
CREATE TABLE IF NOT EXISTS async_callback (
    id VARCHAR(36) PRIMARY KEY,
    execution_id VARCHAR(36) NOT NULL,
    node_execution_id VARCHAR(36) NOT NULL,
    callback_key VARCHAR(255) NOT NULL UNIQUE,  -- 用于匹配回调的唯一标识
    kafka_topic VARCHAR(255),
    status VARCHAR(20) DEFAULT 'waiting',  -- waiting, received, processed, expired
    callback_data TEXT,
    expired_at DATETIME,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES flow_execution(id),
    FOREIGN KEY (node_execution_id) REFERENCES node_execution(id)
);

-- 流程依赖关系表
CREATE TABLE IF NOT EXISTS flow_dependency (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,           -- 主流程ID
    dependent_flow_id VARCHAR(36) NOT NULL, -- 被依赖的流程ID
    node_id VARCHAR(100) NOT NULL,          -- 调用节点ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, node_id)
);

-- 项目表
CREATE TABLE IF NOT EXISTS project (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100),              -- 租户ID（为多租户预留）
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(36),              -- 创建人
    owner_id VARCHAR(36),                -- 项目所有者（可转让）
    is_default BOOLEAN DEFAULT FALSE,    -- 是否为默认项目（默认项目不可删除）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目成员表（控制用户可见的项目）
CREATE TABLE IF NOT EXISTS project_member (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,        -- 用户ID（来自 Keycloak）
    role VARCHAR(20) NOT NULL,           -- owner, admin, editor, viewer
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    UNIQUE(project_id, user_id)
);

-- 模型提供方配置表
CREATE TABLE IF NOT EXISTS model_provider (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    provider_type VARCHAR(20) NOT NULL,  -- STANDARD / CUSTOM
    provider_key VARCHAR(50),            -- 标准提供方标识 (openai/anthropic/...)
    name VARCHAR(100),                   -- 自定义名称
    base_url TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    default_model VARCHAR(120),
    models TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, provider_type, provider_key)
);

-- 向量存储提供方配置表
CREATE TABLE IF NOT EXISTS vector_store_provider (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    provider_key VARCHAR(50) NOT NULL,    -- milvus / qdrant
    name VARCHAR(100) NOT NULL,           -- 自定义名称
    base_url TEXT NOT NULL,
    api_key_encrypted TEXT,
    config_json TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI 流程会话表
CREATE TABLE IF NOT EXISTS ai_flow_session (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36),
    provider_type VARCHAR(20) NOT NULL,
    provider_key VARCHAR(50),
    provider_id VARCHAR(36),
    model VARCHAR(120),
    current_dsl TEXT,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI 流程会话消息表
CREATE TABLE IF NOT EXISTS ai_flow_message (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    patch_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_flow_session(id) ON DELETE CASCADE
);

-- 关键词库表
CREATE TABLE IF NOT EXISTS keyword_library (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_by_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- 关键词词条表
CREATE TABLE IF NOT EXISTS keyword_term (
    id VARCHAR(36) PRIMARY KEY,
    library_id VARCHAR(36) NOT NULL,
    term TEXT NOT NULL,
    match_mode VARCHAR(20) NOT NULL,
    pinyin TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_by_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES keyword_library(id) ON DELETE CASCADE
);

-- 关键词规则组表
CREATE TABLE IF NOT EXISTS keyword_group (
    id VARCHAR(36) PRIMARY KEY,
    library_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    match_mode VARCHAR(20) NOT NULL,
    action_level VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0,
    created_by VARCHAR(36),
    created_by_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(library_id, name),
    FOREIGN KEY (library_id) REFERENCES keyword_library(id) ON DELETE CASCADE
);

-- 关键词规则组-词条关联表
CREATE TABLE IF NOT EXISTS keyword_group_term (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    term_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, term_id),
    FOREIGN KEY (group_id) REFERENCES keyword_group(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES keyword_term(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_flow_definition_project ON flow_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_flow_definition_status ON flow_definition(status);
CREATE INDEX IF NOT EXISTS idx_flow_definition_version_flow ON flow_definition_version(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_execution_flow_id ON flow_execution(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_execution_project ON flow_execution(project_id);
CREATE INDEX IF NOT EXISTS idx_flow_execution_status ON flow_execution(status);
CREATE INDEX IF NOT EXISTS idx_flow_execution_parent ON flow_execution(parent_execution_id);
CREATE INDEX IF NOT EXISTS idx_node_execution_execution_id ON node_execution(execution_id);
CREATE INDEX IF NOT EXISTS idx_async_callback_callback_key ON async_callback(callback_key);
CREATE INDEX IF NOT EXISTS idx_flow_dependency_flow_id ON flow_dependency(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_dependency_dependent ON flow_dependency(dependent_flow_id);
CREATE INDEX IF NOT EXISTS idx_project_tenant ON project(tenant_id);
CREATE INDEX IF NOT EXISTS idx_keyword_library_project ON keyword_library(project_id);
CREATE INDEX IF NOT EXISTS idx_keyword_term_library ON keyword_term(library_id);
CREATE INDEX IF NOT EXISTS idx_keyword_term_pinyin ON keyword_term(library_id, pinyin);
CREATE INDEX IF NOT EXISTS idx_keyword_group_library ON keyword_group(library_id);
CREATE INDEX IF NOT EXISTS idx_keyword_group_term_group ON keyword_group_term(group_id);
CREATE INDEX IF NOT EXISTS idx_keyword_group_term_term ON keyword_group_term(term_id);
CREATE INDEX IF NOT EXISTS idx_project_member_user ON project_member(user_id);
CREATE INDEX IF NOT EXISTS idx_project_member_project ON project_member(project_id);
CREATE INDEX IF NOT EXISTS idx_model_provider_tenant ON model_provider(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vector_store_provider_tenant ON vector_store_provider(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_flow_session_project ON ai_flow_session(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_flow_session_flow ON ai_flow_session(flow_id);
CREATE INDEX IF NOT EXISTS idx_ai_flow_message_session ON ai_flow_message(session_id);

-- 数据结构定义表
CREATE TABLE IF NOT EXISTS data_structure (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,      -- 所属项目
    flow_id VARCHAR(36),                  -- 所属流程（NULL 表示项目级）
    name VARCHAR(100) NOT NULL,           -- 结构名称
    description TEXT,                     -- 结构描述
    fields_json TEXT,                     -- 字段定义（JSON 数组）
    type_parameters_json TEXT,            -- 泛型参数定义（JSON 数组），如 ["T"] 或 [{"name":"T","constraint":"object"}]
    usage_count INTEGER DEFAULT 0,        -- 被引用次数
    created_by VARCHAR(36),               -- 创建人
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flow_definition(id) ON DELETE CASCADE
);

-- 数据结构索引
CREATE INDEX IF NOT EXISTS idx_data_structure_project ON data_structure(project_id);
CREATE INDEX IF NOT EXISTS idx_data_structure_flow ON data_structure(flow_id);
CREATE INDEX IF NOT EXISTS idx_data_structure_name ON data_structure(project_id, flow_id, name);

-- 常量定义表
CREATE TABLE IF NOT EXISTS constant_definition (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,      -- 所属项目
    flow_id VARCHAR(36),                  -- 所属流程（NULL 表示项目级）
    name VARCHAR(100) NOT NULL,           -- 常量名称
    description TEXT,                     -- 常量描述
    value_type VARCHAR(20) NOT NULL,      -- 常量类型
    value_json TEXT,                      -- 常量值（JSON）
    created_by VARCHAR(36),               -- 创建人
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flow_definition(id) ON DELETE CASCADE
);

-- 常量索引
CREATE INDEX IF NOT EXISTS idx_constant_definition_project ON constant_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_constant_definition_flow ON constant_definition(flow_id);
CREATE INDEX IF NOT EXISTS idx_constant_definition_name ON constant_definition(project_id, flow_id, name);

-- 枚举定义表
CREATE TABLE IF NOT EXISTS enum_definition (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,      -- 所属项目
    name VARCHAR(100) NOT NULL,           -- 枚举名称
    description TEXT,                     -- 描述
    values_json TEXT,                     -- 枚举值定义（JSON 数组）
    created_by VARCHAR(36),               -- 创建人
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

-- 枚举索引
CREATE INDEX IF NOT EXISTS idx_enum_definition_project ON enum_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_enum_definition_name ON enum_definition(project_id, name);

-- Simhash 记录表
CREATE TABLE IF NOT EXISTS simhash_record (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36) NOT NULL,
    content_id VARCHAR(200) NOT NULL,
    content_type VARCHAR(50),
    simhash64 BIGINT NOT NULL,
    bucket_0 INTEGER,
    bucket_1 INTEGER,
    bucket_2 INTEGER,
    bucket_3 INTEGER,
    bucket_4 INTEGER,
    bucket_5 INTEGER,
    bucket_6 INTEGER,
    bucket_7 INTEGER,
    token_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flow_definition(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_simhash_project_content ON simhash_record(project_id, content_id);
CREATE INDEX IF NOT EXISTS idx_simhash_project_flow ON simhash_record(project_id, flow_id);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_0 ON simhash_record(project_id, bucket_0);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_1 ON simhash_record(project_id, bucket_1);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_2 ON simhash_record(project_id, bucket_2);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_3 ON simhash_record(project_id, bucket_3);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_4 ON simhash_record(project_id, bucket_4);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_5 ON simhash_record(project_id, bucket_5);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_6 ON simhash_record(project_id, bucket_6);
CREATE INDEX IF NOT EXISTS idx_simhash_bucket_7 ON simhash_record(project_id, bucket_7);
