package com.flowlet.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.Map;

/**
 * 数据库初始化
 */
@Slf4j
@Component
public class DatabaseInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.sql.init.mode:always}")
    private String initMode;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        if ("never".equals(initMode)) {
            log.info("数据库初始化已跳过");
            return;
        }

        try {
            // 检查表是否存在
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='flow_definition'",
                    Integer.class);

            if (count == null || count == 0) {
                log.info("开始初始化数据库表...");
                executeSqlScript();
                log.info("数据库表初始化完成");
            } else {
                log.info("数据库表已存在，跳过初始化");
                ensureModelProviderModelsColumn();
                ensureAiFlowTables();
                ensureVectorStoreTables();
                ensureKeywordTables();
            }
        } catch (Exception e) {
            log.error("数据库初始化失败: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void executeSqlScript() throws Exception {
        ClassPathResource resource = new ClassPathResource("schema.sql");
        String sql = resource.getContentAsString(Objects.requireNonNull(StandardCharsets.UTF_8));

        // 按分号分割SQL语句并执行
        String[] statements = sql.split(";");
        for (String statement : statements) {
            String trimmed = statement.trim();
            if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                jdbcTemplate.execute(trimmed);
            }
        }
    }

    private void ensureModelProviderModelsColumn() {
        List<Map<String, Object>> columns =
                jdbcTemplate.queryForList("PRAGMA table_info(model_provider)");
        boolean hasModels = columns.stream()
                .map(column -> String.valueOf(column.get("name")))
                .anyMatch(name -> "models".equalsIgnoreCase(name));
        if (!hasModels) {
            jdbcTemplate.execute("ALTER TABLE model_provider ADD COLUMN models TEXT");
            log.info("已添加列 model_provider.models");
        }
    }

    private void ensureAiFlowTables() {
        jdbcTemplate.execute("""
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
            )
            """);
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS ai_flow_message (
                id VARCHAR(36) PRIMARY KEY,
                session_id VARCHAR(36) NOT NULL,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                patch_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES ai_flow_session(id) ON DELETE CASCADE
            )
            """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_ai_flow_session_project ON ai_flow_session(project_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_ai_flow_session_flow ON ai_flow_session(flow_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_ai_flow_message_session ON ai_flow_message(session_id)");
    }

    private void ensureVectorStoreTables() {
        jdbcTemplate.execute("""
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
            )
            """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_vector_store_provider_tenant ON vector_store_provider(tenant_id)");
    }

    private void ensureKeywordTables() {
        jdbcTemplate.execute("""
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
            )
            """);
        jdbcTemplate.execute("""
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
            )
            """);
        jdbcTemplate.execute("""
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
            )
            """);
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS keyword_group_term (
                id VARCHAR(36) PRIMARY KEY,
                group_id VARCHAR(36) NOT NULL,
                term_id VARCHAR(36) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, term_id),
                FOREIGN KEY (group_id) REFERENCES keyword_group(id) ON DELETE CASCADE,
                FOREIGN KEY (term_id) REFERENCES keyword_term(id) ON DELETE CASCADE
            )
            """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_library_project ON keyword_library(project_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_term_library ON keyword_term(library_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_term_pinyin ON keyword_term(library_id, pinyin)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_group_library ON keyword_group(library_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_group_term_group ON keyword_group_term(group_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_keyword_group_term_term ON keyword_group_term(term_id)");
        ensureKeywordColumns();
    }

    private void ensureKeywordColumns() {
        ensureKeywordColumn("keyword_term", "pinyin", "TEXT");
        ensureKeywordColumn("keyword_term", "created_by_name", "VARCHAR(255)");
        ensureKeywordColumn("keyword_group", "created_by_name", "VARCHAR(255)");
        ensureKeywordColumn("keyword_library", "created_by_name", "VARCHAR(255)");
    }

    private void ensureKeywordColumn(String table, String column, String type) {
        List<Map<String, Object>> columns =
                jdbcTemplate.queryForList("PRAGMA table_info(" + table + ")");
        boolean exists = columns.stream()
                .map(info -> String.valueOf(info.get("name")))
                .anyMatch(name -> column.equalsIgnoreCase(name));
        if (!exists) {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + type);
            log.info("已添加列 {}.{}", table, column);
        }
    }
}
