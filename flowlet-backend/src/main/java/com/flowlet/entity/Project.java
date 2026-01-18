package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 项目实体
 */
@Data
@TableName("project")
public class Project {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 租户ID（为多租户预留）
     */
    private String tenantId;

    /**
     * 项目名称
     */
    private String name;

    /**
     * 项目描述
     */
    private String description;

    /**
     * 创建人ID
     */
    private String createdBy;

    /**
     * 项目所有者ID（可能与创建人不同，支持转让）
     */
    private String ownerId;

    /**
     * 是否为默认项目（默认项目不可删除）
     */
    private Boolean isDefault;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
