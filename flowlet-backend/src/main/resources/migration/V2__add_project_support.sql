-- ============================================================
-- 增量迁移脚本: 添加多项目支持 (SQLite 版本)
-- 版本: V2
-- 描述: 添加 project 和 project_member 表，
--       为 flow_definition 和 flow_execution 添加 project_id 和 created_by 字段
-- 
-- 注意: SQLite 不支持 ADD COLUMN IF NOT EXISTS，
--       如果列已存在会报错，请忽略该错误继续执行
-- ============================================================

-- 1. 创建项目表
CREATE TABLE IF NOT EXISTS project (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(100),              -- 租户ID（为多租户预留）
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(36),              -- 创建人
    owner_id VARCHAR(36),                -- 项目所有者（可转让）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建项目成员表（控制用户可见的项目）
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

-- 3. 为 flow_definition 添加新字段
-- SQLite 的 ALTER TABLE 只能一次添加一列
ALTER TABLE flow_definition ADD COLUMN project_id VARCHAR(36);
ALTER TABLE flow_definition ADD COLUMN created_by VARCHAR(36);

-- 4. 为 flow_execution 添加新字段
ALTER TABLE flow_execution ADD COLUMN project_id VARCHAR(36);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_flow_definition_project ON flow_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_flow_definition_created_by ON flow_definition(created_by);
CREATE INDEX IF NOT EXISTS idx_flow_execution_project ON flow_execution(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tenant ON project(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_member_user ON project_member(user_id);
CREATE INDEX IF NOT EXISTS idx_project_member_project ON project_member(project_id);

-- ============================================================
-- 数据迁移（可选）
-- 如果需要将现有的 flow_definition 和 flow_execution 迁移到默认项目
-- ============================================================

-- 创建默认项目
-- INSERT INTO project (id, name, description, created_by, owner_id, created_at, updated_at)
-- VALUES ('default-project', 'Default Project', '系统默认项目', 'system', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 将现有流程定义迁移到默认项目
-- UPDATE flow_definition SET project_id = 'default-project' WHERE project_id IS NULL;
-- UPDATE flow_definition SET project_id = '14133b79-c916-479b-ad86-0dd717063117' WHERE project_id IS NULL;

-- 将现有流程执行记录迁移到默认项目
-- UPDATE flow_execution SET project_id = 'default-project' WHERE project_id IS NULL;
-- UPDATE flow_execution SET project_id = '14133b79-c916-479b-ad86-0dd717063117' WHERE project_id IS NULL;
