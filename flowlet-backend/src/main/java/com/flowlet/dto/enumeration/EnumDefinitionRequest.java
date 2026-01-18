package com.flowlet.dto.enumeration;

import lombok.Data;

import java.util.List;

/**
 * 创建/更新枚举请求
 */
@Data
public class EnumDefinitionRequest {
    private String name;
    private String description;
    private List<EnumValueDTO> values;
}
