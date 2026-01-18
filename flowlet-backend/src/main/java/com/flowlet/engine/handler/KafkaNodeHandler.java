package com.flowlet.engine.handler;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.kafka.DynamicKafkaConsumerFactory;
import com.flowlet.engine.kafka.DynamicKafkaProducerFactory;
import com.flowlet.engine.util.TemplateResolver;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka消息节点处理器 (异步)
 * 支持动态配置 Broker 地址和认证信息
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaNodeHandler implements NodeHandler {

    private final DynamicKafkaProducerFactory kafkaProducerFactory;
    private final DynamicKafkaConsumerFactory kafkaConsumerFactory;
    private final ObjectMapper objectMapper;

    @Override
    public String getNodeType() {
        return NodeType.KAFKA.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行Kafka节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("Kafka节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        
        // 验证必需配置
        String brokers = (String) config.get("brokers");
        if (brokers == null || brokers.isEmpty()) {
            return NodeResult.fail("Kafka Broker 地址不能为空");
        }

        String topic = (String) config.get("topic");
        if (topic == null || topic.isEmpty()) {
            return NodeResult.fail("Kafka Topic 不能为空");
        }

        String messageTemplate = (String) config.get("messageTemplate");
        if (messageTemplate == null || messageTemplate.isEmpty()) {
            return NodeResult.fail("Kafka 消息模板不能为空");
        }

        // 获取回调配置
        Boolean waitForCallback = (Boolean) config.get("waitForCallback");
        if (waitForCallback == null) {
            waitForCallback = false;
        }

        try {
            // 创建 Kafka 配置
            DynamicKafkaProducerFactory.KafkaConfig kafkaConfig = kafkaProducerFactory.createConfig(config);

            // 生成回调唯一标识
            String callbackKey = IdUtil.fastSimpleUUID();

            // 获取所有上下文数据用于变量替换
            Map<String, Object> allData = context.getAllData();

            // 解析消息 Key
            String keyExpression = (String) config.get("keyExpression");
            String messageKey = callbackKey;
            if (keyExpression != null && !keyExpression.isEmpty()) {
                messageKey = TemplateResolver.resolve(keyExpression, allData);
            }

            // 解析消息内容模板
            String messageContent = TemplateResolver.resolve(messageTemplate, allData);
            log.debug("模板解析结果: {} -> {}", messageTemplate, messageContent);

            // 获取回调类型配置
            String callbackType = (String) config.get("callbackType");
            if (callbackType == null) {
                callbackType = "http";  // 默认 HTTP 回调
            }

            // 构建完整消息体
            Map<String, Object> message = new HashMap<>();
            message.put("callbackKey", callbackKey);
            message.put("executionId", context.getExecutionId());
            message.put("nodeId", node.getId());
            message.put("waitForCallback", waitForCallback);
            message.put("callbackType", callbackType);
            
            // 根据回调类型设置回调信息
            if ("http".equals(callbackType)) {
                // HTTP 回调 URL
                String httpCallbackUrl = String.format("/api/executions/callback/%s", callbackKey);
                message.put("httpCallbackUrl", httpCallbackUrl);
            } else if ("kafka".equals(callbackType)) {
                // Kafka 回调 Topic
                String callbackTopic = (String) config.get("callbackTopic");
                if (callbackTopic == null || callbackTopic.isEmpty()) {
                    return NodeResult.fail("Kafka 回调模式需要配置回调 Topic");
                }
                String callbackKeyField = (String) config.get("callbackKeyField");
                if (callbackKeyField == null || callbackKeyField.isEmpty()) {
                    callbackKeyField = "callbackKey";
                }
                message.put("callbackTopic", callbackTopic);
                message.put("callbackKeyField", callbackKeyField);
                
                // 如果需要等待回调，注册动态消费者监听回调 Topic
                if (waitForCallback) {
                    log.info("注册 Kafka 回调监听: topic={}, keyField={}", callbackTopic, callbackKeyField);
                    kafkaConsumerFactory.registerCallback(
                            callbackKey,
                            kafkaConfig,
                            callbackTopic,
                            callbackKeyField,
                            300000  // 5分钟超时
                    );
                }
            }

            // 尝试解析用户消息内容为 JSON
            try {
                Object parsedContent = objectMapper.readValue(messageContent, Object.class);
                message.put("payload", parsedContent);
            } catch (JsonProcessingException e) {
                // 如果不是 JSON，作为字符串保存
                message.put("payload", messageContent);
            }

            // 序列化消息
            String messageJson = objectMapper.writeValueAsString(message);

            // 发送消息
            kafkaProducerFactory.send(kafkaConfig, topic, messageKey, messageJson);
            log.info("Kafka消息发送成功: topic={}, key={}, waitForCallback={}", 
                    topic, messageKey, waitForCallback);

            // 构建输出
            Map<String, Object> output = new HashMap<>();
            output.put("topic", topic);
            output.put("messageKey", messageKey);
            output.put("messageSent", true);
            output.put("messageBody", message);  // 记录发送的完整消息体
            
            // 仅当开启等待回调时，才输出回调相关信息
            if (waitForCallback) {
                output.put("callbackKey", callbackKey);
                output.put("callbackType", callbackType);
                
                // 添加回调相关信息到输出
                if ("http".equals(callbackType)) {
                    output.put("httpCallbackUrl", message.get("httpCallbackUrl"));
                } else if ("kafka".equals(callbackType)) {
                    output.put("callbackTopic", message.get("callbackTopic"));
                    output.put("callbackKeyField", message.get("callbackKeyField"));
                }
            }

            if (waitForCallback) {
                // 构建执行过程数据，用于在等待回调时展示
                Map<String, Object> executionData = new HashMap<>();
                executionData.put("topic", topic);
                executionData.put("messageKey", messageKey);
                executionData.put("message", message);
                executionData.put("callbackInfo", Map.of(
                        "callbackKey", callbackKey,
                        "callbackType", callbackType,
                        "httpCallbackUrl", "http".equals(callbackType) ? message.get("httpCallbackUrl") : "",
                        "callbackTopic", "kafka".equals(callbackType) ? message.getOrDefault("callbackTopic", "") : ""
                ));
                
                // 需要等待回调，返回暂停状态（携带执行过程数据）
                return NodeResult.pause(callbackKey, executionData);
            } else {
                // 不需要等待回调，直接返回成功
                return NodeResult.success(output);
            }

        } catch (JsonProcessingException e) {
            log.error("Kafka消息序列化失败: {}", e.getMessage());
            return NodeResult.fail("Kafka消息序列化失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("Kafka消息发送失败: {}", e.getMessage(), e);
            return NodeResult.fail("Kafka消息发送失败: " + e.getMessage());
        }
    }
}
