package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 异步回调记录实体
 */
@Data
@TableName("async_callback")
public class AsyncCallback {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 流程执行实例ID
     */
    private String executionId;

    /**
     * 节点执行记录ID
     */
    private String nodeExecutionId;

    /**
     * 回调唯一标识 (用于匹配回调)
     */
    private String callbackKey;

    /**
     * Kafka Topic
     */
    private String kafkaTopic;

    /**
     * 状态: waiting, received, processed, expired
     */
    private String status;

    /**
     * 回调数据 (JSON)
     */
    private String callbackData;

    /**
     * 过期时间
     */
    private LocalDateTime expiredAt;

    /**
     * 接收回调时间
     */
    private LocalDateTime receivedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
