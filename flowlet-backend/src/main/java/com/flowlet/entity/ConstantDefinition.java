package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 常量定义实体
 * 支持项目级和流程级两种作用域
 */
@Data
@TableName("constant_definition")
public class ConstantDefinition {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 所属流程ID（为空表示项目级常量）
     */
    private String flowId;

    /**
     * 常量名称（同一作用域内唯一）
     */
    private String name;

    /**
     * 描述
     */
    private String description;

    /**
     * 常量类型
     */
    private String valueType;

    /**
     * 常量值 (JSON)
     */
    private String valueJson;

    /**
     * 创建人ID
     */
    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 是否为项目级常量
     */
    public boolean isProjectLevel() {
        return flowId == null || flowId.isEmpty();
    }
}
