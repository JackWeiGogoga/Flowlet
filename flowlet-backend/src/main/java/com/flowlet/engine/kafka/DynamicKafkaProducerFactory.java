package com.flowlet.engine.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * 动态 Kafka 生产者工厂
 * 根据节点配置动态创建 Kafka 生产者
 */
@Slf4j
@Component
public class DynamicKafkaProducerFactory {

    /**
     * 缓存已创建的生产者，key 为配置的 hash
     */
    private final Map<String, Producer<String, String>> producerCache = new ConcurrentHashMap<>();

    /**
     * Kafka 认证类型
     */
    public enum AuthType {
        NONE("none"),
        SASL_PLAIN("sasl_plain"),
        SASL_SCRAM("sasl_scram");

        private final String value;

        AuthType(String value) {
            this.value = value;
        }

        public static AuthType fromValue(String value) {
            if (value == null) return NONE;
            for (AuthType type : values()) {
                if (type.value.equalsIgnoreCase(value)) {
                    return type;
                }
            }
            return NONE;
        }
    }

    /**
     * Kafka 连接配置
     */
    public static class KafkaConfig {
        private String brokers;
        private AuthType authType = AuthType.NONE;
        private String username;
        private String password;

        public String getBrokers() { return brokers; }
        public void setBrokers(String brokers) { this.brokers = brokers; }
        public AuthType getAuthType() { return authType; }
        public void setAuthType(AuthType authType) { this.authType = authType; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        /**
         * 生成配置的唯一标识
         */
        public String getCacheKey() {
            return String.format("%s|%s|%s", brokers, authType, username);
        }
    }

    /**
     * 从节点配置创建 KafkaConfig
     */
    public KafkaConfig createConfig(Map<String, Object> nodeConfig) {
        KafkaConfig config = new KafkaConfig();
        config.setBrokers((String) nodeConfig.get("brokers"));
        config.setAuthType(AuthType.fromValue((String) nodeConfig.get("authType")));
        config.setUsername((String) nodeConfig.get("username"));
        config.setPassword((String) nodeConfig.get("password"));
        return config;
    }

    /**
     * 获取或创建 Kafka 生产者
     */
    public Producer<String, String> getOrCreateProducer(KafkaConfig config) {
        String cacheKey = config.getCacheKey();
        
        return producerCache.computeIfAbsent(cacheKey, key -> {
            log.info("创建新的 Kafka 生产者: brokers={}, authType={}", 
                    config.getBrokers(), config.getAuthType());
            return createProducer(config);
        });
    }

    /**
     * 创建 Kafka 生产者
     */
    private Producer<String, String> createProducer(KafkaConfig config) {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, config.getBrokers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        
        // 性能配置
        props.put(ProducerConfig.ACKS_CONFIG, "1");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 1);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);
        
        // 认证配置
        if (config.getAuthType() != AuthType.NONE) {
            configureSasl(props, config);
        }

        return new KafkaProducer<>(props);
    }

    /**
     * 配置 SASL 认证
     */
    private void configureSasl(Properties props, KafkaConfig config) {
        props.put("security.protocol", "SASL_PLAINTEXT");
        
        String mechanism;
        String jaasConfig;
        
        switch (config.getAuthType()) {
            case SASL_PLAIN:
                mechanism = "PLAIN";
                jaasConfig = String.format(
                    "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                    "username=\"%s\" password=\"%s\";",
                    config.getUsername(), config.getPassword()
                );
                break;
            case SASL_SCRAM:
                mechanism = "SCRAM-SHA-256";
                jaasConfig = String.format(
                    "org.apache.kafka.common.security.scram.ScramLoginModule required " +
                    "username=\"%s\" password=\"%s\";",
                    config.getUsername(), config.getPassword()
                );
                break;
            default:
                return;
        }
        
        props.put("sasl.mechanism", mechanism);
        props.put("sasl.jaas.config", jaasConfig);
        
        log.info("已配置 SASL 认证: mechanism={}", mechanism);
    }

    /**
     * 发送消息
     */
    public void send(KafkaConfig config, String topic, String key, String value) throws Exception {
        Producer<String, String> producer = getOrCreateProducer(config);
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
        
        Future<RecordMetadata> future = producer.send(record);
        RecordMetadata metadata = future.get(30, TimeUnit.SECONDS);
        
        log.info("消息发送成功: topic={}, partition={}, offset={}", 
                metadata.topic(), metadata.partition(), metadata.offset());
    }

    /**
     * 关闭所有生产者
     */
    public void closeAll() {
        log.info("关闭所有 Kafka 生产者, 数量: {}", producerCache.size());
        producerCache.values().forEach(producer -> {
            try {
                producer.close();
            } catch (Exception e) {
                log.warn("关闭生产者失败: {}", e.getMessage());
            }
        });
        producerCache.clear();
    }

    /**
     * 移除指定配置的生产者
     */
    public void removeProducer(String cacheKey) {
        Producer<String, String> producer = producerCache.remove(cacheKey);
        if (producer != null) {
            try {
                producer.close();
            } catch (Exception e) {
                log.warn("关闭生产者失败: {}", e.getMessage());
            }
        }
    }
}
