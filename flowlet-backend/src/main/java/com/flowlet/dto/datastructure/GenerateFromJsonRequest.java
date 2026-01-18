package com.flowlet.dto.datastructure;

import lombok.Data;

import java.util.Map;

/**
 * 从 JSON 样本生成数据结构请求
 */
@Data
public class GenerateFromJsonRequest {
    
    /**
     * JSON 样本字符串
     */
    private String jsonSample;
    
    /**
     * 或者直接传入对象
     */
    private Map<String, Object> jsonObject;
    
    /**
     * 生成的结构体名称
     */
    private String structureName;
    
    /**
     * 所属流程ID（为空表示项目级结构）
     */
    private String flowId;
    
    /**
     * 是否递归生成嵌套结构（生成独立的子结构体）
     */
    private Boolean generateNestedStructures;
}
