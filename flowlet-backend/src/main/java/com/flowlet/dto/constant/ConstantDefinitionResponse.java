package com.flowlet.dto.constant;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 常量定义响应
 */
@Data
public class ConstantDefinitionResponse {

    private String id;
    private String projectId;
    private String flowId;
    private String flowName;
    private String name;
    private String description;
    private String valueType;
    private Object value;
    private Boolean isProjectLevel;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
