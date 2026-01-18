package com.flowlet.dto.datastructure;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 数据结构响应 DTO
 */
@Data
public class DataStructureResponse {
    
    /**
     * 结构ID
     */
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
     * 所属流程名称
     */
    private String flowName;
    
    /**
     * 结构体名称
     */
    private String name;
    
    /**
     * 完整引用名称
     * 项目级: global.StructName
     * 流程级: flowName.StructName
     */
    private String fullName;
    
    /**
     * 描述
     */
    private String description;
    
    /**
     * 字段定义列表
     */
    private List<FieldDefinitionDTO> fields;
    
    /**
     * 泛型参数列表
     */
    private List<TypeParameterDTO> typeParameters;
    
    /**
     * 是否为泛型结构
     */
    private Boolean isGeneric;
    
    /**
     * 被引用次数
     */
    private Integer usageCount;
    
    /**
     * 是否为项目级结构
     */
    private Boolean isProjectLevel;
    
    /**
     * 创建人ID
     */
    private String createdBy;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
