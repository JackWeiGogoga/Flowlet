package com.flowlet.dto.constant;

import lombok.Data;

/**
 * 常量定义请求
 */
@Data
public class ConstantDefinitionRequest {

    /**
     * 所属流程ID（为空表示项目级常量）
     */
    private String flowId;

    /**
     * 常量名称
     */
    private String name;

    /**
     * 描述
     */
    private String description;

    /**
     * 常量类型 (string/number/boolean/object/array)
     */
    private String valueType;

    /**
     * 常量值
     */
    private Object value;
}
