package com.flowlet.dto.keyword;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关键词词条响应
 */
@Data
public class KeywordTermResponse {
    private String id;
    private String libraryId;
    private String term;
    private String matchMode;
    private Boolean enabled;
    private java.util.List<String> groupIds;
    private String createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
