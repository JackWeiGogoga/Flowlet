package com.flowlet.consumer;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.service.FlowExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Kafka 回调消费者
 * 用于接收外部系统的回调消息
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "flowlet.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class CallbackConsumer {

    private final FlowExecutionService flowExecutionService;
    private final ObjectMapper objectMapper;

    /**
     * 监听回调topic
     */
    @KafkaListener(topics = "${flowlet.kafka.callback-topic:flowlet-callback}")
    public void handleCallback(String message) {
        log.info("########## Kafka回调消费者收到消息 ##########");
        log.info("原始消息内容: {}", message);

        try {
            // 检查消息是否为空
            if (message == null || message.trim().isEmpty()) {
                log.warn("收到空消息，忽略");
                return;
            }

            Map<String, Object> data = objectMapper.readValue(
                    message, new TypeReference<Map<String, Object>>() {});
            log.info("解析后的消息数据: {}", data);

            String callbackKey = (String) data.get("callbackKey");
            if (callbackKey == null) {
                log.warn("回调消息缺少callbackKey字段，消息内容: {}", data);
                return;
            }
            log.info("提取到callbackKey: {}", callbackKey);

            // 处理回调
            log.info("调用flowExecutionService.handleCallback处理回调...");
            flowExecutionService.handleCallback(callbackKey, data);
            log.info("########## Kafka回调消息处理完成 ##########");

        } catch (Exception e) {
            log.error("处理回调消息失败: {}", e.getMessage(), e);
            log.error("失败的消息内容: {}", message);
        }
    }
}
