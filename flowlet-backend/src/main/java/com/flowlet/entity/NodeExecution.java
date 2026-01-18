package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 节点执行记录实体
 */
@Data
@TableName("node_execution")
public class NodeExecution {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 流程执行实例ID
     */
    private String executionId;

    /**
     * 节点ID (流程图中的节点标识)
     */
    private String nodeId;

    /**
     * 节点类型: start, end, api, kafka, condition, etc.
     */
    private String nodeType;

    /**
     * 节点名称
     */
    private String nodeName;

    /**
     * 执行状态: pending, running, waiting_callback, completed, failed, skipped
     */
    private String status;

    /**
     * 节点输入数据 (JSON)
     */
    private String inputData;

    /**
     * 节点输出数据 (JSON)
     */
    private String outputData;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 执行过程数据 (JSON) - 用于记录节点执行的中间信息
     * 如：API节点的请求URL、请求体、同步响应；Kafka节点发送的消息等
     * 在等待回调时也能展示这些信息
     */
    private String executionData;

    /**
     * 重试次数
     */
    private Integer retryCount;

    /**
     * 开始执行时间
     */
    private LocalDateTime startedAt;

    /**
     * 完成时间
     */
    private LocalDateTime completedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
