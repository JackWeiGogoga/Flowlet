package com.flowlet.dto.datastructure;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;

/**
 * 创建/更新数据结构请求
 */
@Data
public class DataStructureRequest {
    
    /**
     * 结构体名称（必须是合法的标识符）
     */
    @NotBlank(message = "结构体名称不能为空")
    @Pattern(regexp = "^[A-Z][a-zA-Z0-9]*$", message = "结构体名称必须以大写字母开头，只能包含字母和数字")
    private String name;
    
    /**
     * 描述
     */
    private String description;
    
    /**
     * 字段定义列表
     */
    private List<FieldDefinitionDTO> fields;
    
    /**
     * 泛型参数列表（可选）
     * 用于定义类似 Result<T> 的泛型结构
     */
    private List<TypeParameterDTO> typeParameters;
    
    /**
     * 所属流程ID（为空表示项目级结构）
     */
    private String flowId;
}
