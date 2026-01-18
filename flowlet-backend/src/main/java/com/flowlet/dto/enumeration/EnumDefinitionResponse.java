package com.flowlet.dto.enumeration;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 枚举定义响应
 */
@Data
public class EnumDefinitionResponse {
    private String id;
    private String projectId;
    private String name;
    private String description;
    private List<EnumValueDTO> values;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
