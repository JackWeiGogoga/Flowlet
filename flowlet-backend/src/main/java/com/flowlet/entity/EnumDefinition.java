package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 枚举定义实体
 */
@Data
@TableName("enum_definition")
public class EnumDefinition {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 枚举名称（同一项目内唯一）
     */
    private String name;

    /**
     * 描述
     */
    private String description;

    /**
     * 枚举值定义 (JSON)
     * 格式: [{"value": "READY", "label": "就绪", "description": "..."}, ...]
     */
    private String valuesJson;

    /**
     * 创建人ID
     */
    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
