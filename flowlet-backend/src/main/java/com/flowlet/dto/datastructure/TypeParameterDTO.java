package com.flowlet.dto.datastructure;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 泛型参数定义 DTO
 * 用于定义类似 Result<T> 中的 T
 */
@Data
public class TypeParameterDTO {
    
    /**
     * 参数名称（通常是单个大写字母，如 T, E, K, V）
     */
    @NotBlank(message = "类型参数名称不能为空")
    @Pattern(regexp = "^[A-Z][a-zA-Z0-9]*$", message = "类型参数名称必须以大写字母开头")
    private String name;
    
    /**
     * 约束类型（可选）
     * 如: object, string, number 等
     * 为空表示无约束，可以是任意类型
     */
    private String constraint;
    
    /**
     * 参数描述
     */
    private String description;
    
    /**
     * 默认类型（可选）
     * 如果使用时未指定具体类型，使用此默认值
     */
    private String defaultType;
    
    /**
     * 便捷构造方法
     */
    public static TypeParameterDTO of(String name) {
        TypeParameterDTO dto = new TypeParameterDTO();
        dto.setName(name);
        return dto;
    }
    
    public static TypeParameterDTO of(String name, String description) {
        TypeParameterDTO dto = new TypeParameterDTO();
        dto.setName(name);
        dto.setDescription(description);
        return dto;
    }
}
