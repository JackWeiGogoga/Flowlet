package com.flowlet.dto.keyword;

import lombok.Data;

import java.util.List;

/**
 * 关键词规则组请求
 */
@Data
public class KeywordGroupRequest {
    private String name;
    private String description;
    private Boolean enabled;
    private String actionLevel;
    private Integer priority;
    private List<String> termIds;
}
