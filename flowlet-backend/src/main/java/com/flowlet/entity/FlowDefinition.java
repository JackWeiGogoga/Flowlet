package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 流程定义实体
 */
@Data
@TableName("flow_definition")
public class FlowDefinition {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 流程名称
     */
    private String name;

    /**
     * 流程描述
     */
    private String description;

    /**
     * 流程图数据 (JSON)
     */
    private String graphData;

    /**
     * 输入参数的 JSON Schema
     */
    private String inputSchema;

    /**
     * 状态: draft, published, disabled
     */
    private String status;

    /**
     * 版本号
     */
    private Integer version;

    /**
     * 是否为公共流程（可被其他流程调用）
     */
    private Boolean isReusable;

    /**
     * 被调用次数统计
     */
    private Integer callCount;

    /**
     * 创建人ID
     */
    private String createdBy;

    /**
     * 创建人用户名（preferred_username）
     */
    private String createdByName;

    /**
     * 原始流程ID（调试模式下使用，不存储到数据库）
     * 用于获取流程级常量
     */
    @TableField(exist = false)
    private String originalFlowId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
