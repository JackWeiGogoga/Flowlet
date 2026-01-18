package com.flowlet.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

import java.util.Objects;

/**
 * Kafka 配置
 */
@Configuration
@ConditionalOnProperty(name = "flowlet.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    @Value("${flowlet.kafka.callback-topic:flowlet-callback}")
    private String callbackTopic;

    /**
     * 创建回调topic
     * 注意：callbackTopic 通过 @Value 注入，有默认值 "flowlet-callback"
     * requireNonNull 仅用于满足编译器静态检查
     */
    @Bean
    public NewTopic callbackTopic() {
        return TopicBuilder.name(Objects.requireNonNull(callbackTopic, 
                "配置项 flowlet.kafka.callback-topic 不能为空"))
                .partitions(3)
                .replicas(1)
                .build();
    }
}
