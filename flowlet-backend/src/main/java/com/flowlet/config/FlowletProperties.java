package com.flowlet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Flowlet 自定义配置属性类
 * 用于绑定 application.yml 中 flowlet.* 开头的配置项
 */
@Component
@ConfigurationProperties(prefix = "flowlet")
public class FlowletProperties {

    private KafkaProperties kafka = new KafkaProperties();
    private SecurityProperties security = new SecurityProperties();
    private CodeExecutorProperties codeExecutor = new CodeExecutorProperties();
    private VectorStoreProperties vectorStore = new VectorStoreProperties();

    public KafkaProperties getKafka() {
        return kafka;
    }

    public void setKafka(KafkaProperties kafka) {
        this.kafka = kafka;
    }

    public SecurityProperties getSecurity() {
        return security;
    }

    public void setSecurity(SecurityProperties security) {
        this.security = security;
    }

    public CodeExecutorProperties getCodeExecutor() {
        return codeExecutor;
    }

    public void setCodeExecutor(CodeExecutorProperties codeExecutor) {
        this.codeExecutor = codeExecutor;
    }

    /**
     * Kafka 相关配置
     */
    public static class KafkaProperties {
        /**
         * 是否启用 Kafka（默认禁用）
         */
        private boolean enabled = false;

        /**
         * 回调 Topic 名称
         */
        private String callbackTopic = "flowlet-callback";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getCallbackTopic() {
            return callbackTopic;
        }

        public void setCallbackTopic(String callbackTopic) {
            this.callbackTopic = callbackTopic;
        }
    }

    /**
     * 安全相关配置
     */
    public static class SecurityProperties {
        /**
         * 是否启用 Keycloak JWT 认证
         */
        private boolean enabled = true;

        /**
         * 模型配置加密密钥
         */
        private String modelHubKey;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getModelHubKey() {
            return modelHubKey;
        }

        public void setModelHubKey(String modelHubKey) {
            this.modelHubKey = modelHubKey;
        }
    }

    /**
     * 代码执行服务配置
     */
    public static class CodeExecutorProperties {
        /**
         * 执行服务 Base URL
         */
        private String baseUrl = "http://localhost:8090";

        /**
         * 请求超时（毫秒）
         */
        private int requestTimeoutMs = 5000;

        /**
         * 默认代码执行超时（毫秒）
         */
        private int defaultTimeoutMs = 3000;

        /**
         * 默认内存限制（MB）
         */
        private int defaultMemoryMb = 128;

        /**
         * 默认是否允许网络访问
         */
        private boolean defaultAllowNetwork = false;

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public int getRequestTimeoutMs() {
            return requestTimeoutMs;
        }

        public void setRequestTimeoutMs(int requestTimeoutMs) {
            this.requestTimeoutMs = requestTimeoutMs;
        }

        public int getDefaultTimeoutMs() {
            return defaultTimeoutMs;
        }

        public void setDefaultTimeoutMs(int defaultTimeoutMs) {
            this.defaultTimeoutMs = defaultTimeoutMs;
        }

        public int getDefaultMemoryMb() {
            return defaultMemoryMb;
        }

        public void setDefaultMemoryMb(int defaultMemoryMb) {
            this.defaultMemoryMb = defaultMemoryMb;
        }

        public boolean isDefaultAllowNetwork() {
            return defaultAllowNetwork;
        }

        public void setDefaultAllowNetwork(boolean defaultAllowNetwork) {
            this.defaultAllowNetwork = defaultAllowNetwork;
        }
    }

    /**
     * 向量存储服务配置
     */
    public static class VectorStoreProperties {
        /**
         * 向量存储服务 Base URL
         */
        private String baseUrl = "http://localhost:18091";

        /**
         * 请求超时（毫秒）
         */
        private int requestTimeoutMs = 30000;

        /**
         * Embedding 服务 Base URL（用于文本向量化）
         */
        private String embeddingBaseUrl = "http://localhost:18092";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public int getRequestTimeoutMs() {
            return requestTimeoutMs;
        }

        public void setRequestTimeoutMs(int requestTimeoutMs) {
            this.requestTimeoutMs = requestTimeoutMs;
        }

        public String getEmbeddingBaseUrl() {
            return embeddingBaseUrl;
        }

        public void setEmbeddingBaseUrl(String embeddingBaseUrl) {
            this.embeddingBaseUrl = embeddingBaseUrl;
        }
    }

    public VectorStoreProperties getVectorStore() {
        return vectorStore;
    }

    public void setVectorStore(VectorStoreProperties vectorStore) {
        this.vectorStore = vectorStore;
    }
}
