package com.flowlet.dto.keyword;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 关键词规则组响应
 */
@Data
public class KeywordGroupResponse {
    private String id;
    private String libraryId;
    private String name;
    private String description;
    private Boolean enabled;
    private String actionLevel;
    private Integer priority;
    private List<String> termIds;
    private String createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
