package com.flowlet.engine.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.service.FlowExecutionService;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/**
 * 动态 Kafka 消费者工厂
 * 用于创建和管理回调监听的消费者
 * 
 * 与 CallbackConsumer 的区别：
 * - CallbackConsumer: 监听固定的默认回调 Topic (flowlet-callback)
 * - DynamicKafkaConsumerFactory: 监听用户在流程节点中配置的自定义回调 Topic
 */
@Slf4j
@Component
public class DynamicKafkaConsumerFactory {

    private final ObjectMapper objectMapper;
    private final FlowExecutionService flowExecutionService;
    
    public DynamicKafkaConsumerFactory(ObjectMapper objectMapper, @Lazy FlowExecutionService flowExecutionService) {
        this.objectMapper = objectMapper;
        this.flowExecutionService = flowExecutionService;
    }
    
    /**
     * 活动的消费者任务映射: topic -> 任务
     */
    private final Map<String, ConsumerTask> consumerTasks = new ConcurrentHashMap<>();
    
    /**
     * 回调等待映射: callbackKey -> CompletableFuture
     */
    private final Map<String, CompletableFuture<Map<String, Object>>> callbackWaiters = new ConcurrentHashMap<>();
    
    /**
     * 消费者线程池
     */
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 消费者任务
     */
    private static class ConsumerTask {
        final KafkaConsumer<String, String> consumer;
        final Future<?> future;
        volatile boolean running = true;
        
        ConsumerTask(KafkaConsumer<String, String> consumer, Future<?> future) {
            this.consumer = consumer;
            this.future = future;
        }
        
        void stop() {
            running = false;
            consumer.wakeup();
        }
        
        /**
         * 等待任务结束
         */
        void awaitTermination(long timeout, TimeUnit unit) {
            try {
                future.get(timeout, unit);
            } catch (Exception e) {
                // 忽略异常，任务可能已经结束或被取消
            }
        }
    }

    /**
     * 注册回调等待
     * @param callbackKey 回调唯一标识
     * @param config Kafka 连接配置
     * @param callbackTopic 回调 Topic
     * @param callbackKeyField 回调消息中的关联字段
     * @param timeout 超时时间(毫秒)
     * @return CompletableFuture 包含回调结果
     */
    public CompletableFuture<Map<String, Object>> registerCallback(
            String callbackKey, 
            DynamicKafkaProducerFactory.KafkaConfig config,
            String callbackTopic,
            String callbackKeyField,
            long timeout) {
        
        log.info("注册 Kafka 回调等待: callbackKey={}, topic={}, keyField={}", 
                callbackKey, callbackTopic, callbackKeyField);
        
        CompletableFuture<Map<String, Object>> future = new CompletableFuture<>();
        callbackWaiters.put(callbackKey, future);
        
        // 确保消费者正在运行
        ensureConsumerRunning(config, callbackTopic, callbackKeyField);
        
        // 设置超时
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.schedule(() -> {
            if (!future.isDone()) {
                future.completeExceptionally(new TimeoutException("Kafka 回调超时: " + callbackKey));
                callbackWaiters.remove(callbackKey);
            }
            scheduler.shutdown();
        }, timeout, TimeUnit.MILLISECONDS);
        
        return future;
    }

    /**
     * 确保消费者正在运行
     */
    private synchronized void ensureConsumerRunning(
            DynamicKafkaProducerFactory.KafkaConfig config,
            String topic,
            String callbackKeyField) {
        
        String cacheKey = buildCacheKey(config, topic);
        
        if (consumerTasks.containsKey(cacheKey)) {
            log.debug("消费者已存在: {}", cacheKey);
            return;
        }
        
        log.info("创建新的 Kafka 消费者: topic={}", topic);
        
        KafkaConsumer<String, String> consumer = createConsumer(config);
        consumer.subscribe(Collections.singletonList(topic));
        
        Future<?> future = executorService.submit(() -> {
            ConsumerTask task = consumerTasks.get(cacheKey);
            
            while (task != null && task.running) {
                try {
                    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
                    
                    records.forEach(record -> {
                        try {
                            processCallbackMessage(record.value(), callbackKeyField);
                        } catch (Exception e) {
                            log.error("处理回调消息失败: {}", e.getMessage());
                        }
                    });
                } catch (org.apache.kafka.common.errors.WakeupException e) {
                    // 正常停止
                    log.info("消费者停止: {}", cacheKey);
                    break;
                } catch (Exception e) {
                    log.error("消费者异常: {}", e.getMessage(), e);
                }
            }
            
            try {
                consumer.close();
            } catch (Exception e) {
                log.warn("关闭消费者失败: {}", e.getMessage());
            }
        });
        
        consumerTasks.put(cacheKey, new ConsumerTask(consumer, future));
    }

    /**
     * 处理回调消息
     */
    private void processCallbackMessage(String messageJson, String callbackKeyField) {
        log.info("########## 动态消费者收到回调消息 ##########");
        log.info("原始消息: {}", messageJson);
        log.info("关联字段: {}", callbackKeyField);
        
        try {
            Map<String, Object> message = objectMapper.readValue(
                    messageJson, new TypeReference<Map<String, Object>>() {});
            log.info("解析后的消息: {}", message);
            
            Object callbackKeyObj = message.get(callbackKeyField);
            if (callbackKeyObj == null) {
                log.warn("回调消息缺少关联字段 {}: {}", callbackKeyField, messageJson);
                return;
            }
            
            String callbackKey = String.valueOf(callbackKeyObj);
            log.info("提取到 callbackKey: {}", callbackKey);
            
            // 先检查本地等待的 Future
            CompletableFuture<Map<String, Object>> waiter = callbackWaiters.remove(callbackKey);
            if (waiter != null) {
                log.info("找到本地等待的 Future，完成回调");
                waiter.complete(message);
            }
            
            // 同时也调用 FlowExecutionService 处理（支持暂停恢复模式）
            log.info("调用 FlowExecutionService.handleCallback 处理回调...");
            flowExecutionService.handleCallback(callbackKey, message);
            log.info("########## 动态消费者回调处理完成 ##########");
            
        } catch (Exception e) {
            log.error("解析回调消息失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 创建 Kafka 消费者
     */
    private KafkaConsumer<String, String> createConsumer(DynamicKafkaProducerFactory.KafkaConfig config) {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, config.getBrokers());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        
        // 消费者组配置
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "flowlet-callback-" + UUID.randomUUID().toString().substring(0, 8));
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");
        
        // 认证配置
        if (config.getAuthType() != DynamicKafkaProducerFactory.AuthType.NONE) {
            configureSasl(props, config);
        }
        
        return new KafkaConsumer<>(props);
    }

    /**
     * 配置 SASL 认证
     */
    private void configureSasl(Properties props, DynamicKafkaProducerFactory.KafkaConfig config) {
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
    }

    /**
     * 构建缓存键
     */
    private String buildCacheKey(DynamicKafkaProducerFactory.KafkaConfig config, String topic) {
        return config.getCacheKey() + "|" + topic;
    }

    /**
     * 关闭所有消费者
     */
    @PreDestroy
    public void closeAll() {
        log.info("关闭所有 Kafka 消费者, 数量: {}", consumerTasks.size());
        
        // 停止所有消费者任务
        consumerTasks.values().forEach(ConsumerTask::stop);
        
        // 等待所有任务结束
        consumerTasks.values().forEach(task -> task.awaitTermination(5, TimeUnit.SECONDS));
        
        consumerTasks.clear();
        callbackWaiters.clear();
        
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
        }
    }
}
