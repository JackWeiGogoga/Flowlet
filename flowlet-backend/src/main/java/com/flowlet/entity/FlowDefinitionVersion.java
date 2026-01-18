package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 流程定义版本
 */
@Data
@TableName("flow_definition_version")
public class FlowDefinitionVersion {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属流程ID
     */
    private String flowId;

    /**
     * 版本号（发布递增）
     */
    private Integer version;

    /**
     * 流程名称（发布时快照）
     */
    private String name;

    /**
     * 流程描述（发布时快照）
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
     * 发布人
     */
    private String createdBy;

    /**
     * 发布人名称
     */
    private String createdByName;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
