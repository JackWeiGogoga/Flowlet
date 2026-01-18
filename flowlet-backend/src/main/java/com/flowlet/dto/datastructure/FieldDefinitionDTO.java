package com.flowlet.dto.datastructure;

import lombok.Data;

import java.util.List;

/**
 * 字段定义 DTO
 */
@Data
public class FieldDefinitionDTO {
    
    /**
     * 字段名称
     */
    private String name;
    
    /**
     * 字段类型: string, number, boolean, object, array
     */
    private String type;
    
    /**
     * 是否必填
     */
    private Boolean required;
    
    /**
     * 字段描述
     */
    private String description;
    
    /**
     * 引用类型（用于 object 类型引用其他结构体）
     * 格式: 
     *   - 本流程结构: "StructName"
     *   - 其他流程结构: "flowAlias.StructName"
     *   - 项目级结构: "global.StructName"
     */
    private String refType;
    
    /**
     * 数组元素类型（用于 array 类型）
     * 可以是基础类型或引用类型
     */
    private String itemType;
    
    /**
     * 内联嵌套字段（用于不引用外部结构的 object 类型）
     */
    private List<FieldDefinitionDTO> nestedFields;
    
    /**
     * 数组元素的内联字段定义（用于不引用外部结构的 array 类型）
     */
    private List<FieldDefinitionDTO> itemFields;
    
    /**
     * 默认值
     */
    private Object defaultValue;
    
    /**
     * 示例值（用于文档展示）
     */
    private Object example;
}
