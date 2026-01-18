package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 流程依赖关系实体
 */
@Data
@TableName("flow_dependency")
public class FlowDependency {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 主流程ID（调用方）
     */
    private String flowId;

    /**
     * 被依赖的流程ID（被调用方）
     */
    private String dependentFlowId;

    /**
     * 调用节点ID
     */
    private String nodeId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
