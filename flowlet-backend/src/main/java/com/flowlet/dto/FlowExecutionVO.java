package com.flowlet.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 流程执行实例 VO（包含关联的流程名称）
 */
@Data
public class FlowExecutionVO {

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
     * 流程名称（关联查询）
     */
    private String flowName;

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
     * 错误信息
     */
    private String errorMessage;

    /**
     * 父执行实例ID（如果是子流程执行）
     */
    private String parentExecutionId;

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

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
