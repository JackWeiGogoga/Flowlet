package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 数据结构定义实体
 * 支持项目级和流程级两种作用域
 */
@Data
@TableName("data_structure")
public class DataStructure {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 所属流程ID（为空表示项目级结构）
     */
    private String flowId;

    /**
     * 结构体名称（同一作用域内唯一）
     */
    private String name;

    /**
     * 描述
     */
    private String description;

    /**
     * 字段定义 (JSON)
     * 格式: [{"name": "id", "type": "string", "required": true, "description": "..."}, ...]
     */
    private String fieldsJson;

    /**
     * 泛型参数列表 (JSON)
     * 格式: ["T", "E"] 或 [{"name": "T", "constraint": "object", "description": "数据类型"}]
     * 用于定义类似 Result<T> 的泛型结构
     */
    private String typeParametersJson;

    /**
     * 是否为泛型结构
     */
    public boolean isGeneric() {
        return typeParametersJson != null && !typeParametersJson.isEmpty() 
            && !typeParametersJson.equals("[]");
    }

    /**
     * 被引用次数（统计）
     */
    private Integer usageCount;

    /**
     * 创建人ID
     */
    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 是否为项目级结构
     */
    public boolean isProjectLevel() {
        return flowId == null || flowId.isEmpty();
    }

    /**
     * 获取完整引用名称
     * 项目级: global.StructName
     * 流程级: flowAlias.StructName (需要外部提供 flowAlias)
     */
    public String getFullReferenceName(String flowAlias) {
        if (isProjectLevel()) {
            return "global." + name;
        }
        return (flowAlias != null ? flowAlias : flowId) + "." + name;
    }
}
