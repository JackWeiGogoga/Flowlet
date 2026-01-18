package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 流程执行实例实体
 */
@Data
@TableName("flow_execution")
public class FlowExecution {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 流程定义ID
     */
    private String flowId;

    /**
     * 执行时的流程版本
     */
    private Integer flowVersion;

    /**
     * 执行状态: pending, running, paused, completed, failed
     */
    private String status;

    /**
     * 输入数据 (JSON)
     */
    private String inputData;

    /**
     * 输出数据 (JSON)
     */
    private String outputData;

    /**
     * 执行上下文数据 (JSON)
     */
    private String contextData;

    /**
     * 当前执行到的节点ID
     */
    private String currentNodeId;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 父执行实例ID（如果是子流程执行）
     */
    private String parentExecutionId;

    /**
     * 父节点执行ID
     */
    private String parentNodeExecutionId;

    /**
     * 调用链路追踪（JSON数组）
     */
    private String callChain;

    /**
     * 触发人ID
     */
    private String triggeredBy;

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
