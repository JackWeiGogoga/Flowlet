package com.flowlet.dto.keyword;

import lombok.Data;

/**
 * 关键词库请求
 */
@Data
public class KeywordLibraryRequest {
    private String name;
    private String description;
    private Boolean enabled;
}
