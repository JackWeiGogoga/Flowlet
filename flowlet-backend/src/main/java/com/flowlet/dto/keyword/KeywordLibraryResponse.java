package com.flowlet.dto.keyword;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关键词库响应
 */
@Data
public class KeywordLibraryResponse {
    private String id;
    private String projectId;
    private String name;
    private String description;
    private Boolean enabled;
    private String createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
