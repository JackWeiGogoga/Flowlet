package com.flowlet.dto.keyword;

import lombok.Data;

/**
 * 关键词词条请求
 */
@Data
public class KeywordTermRequest {
    private String term;
    private String matchMode;
    private Boolean enabled;
    private java.util.List<String> groupIds;
}
