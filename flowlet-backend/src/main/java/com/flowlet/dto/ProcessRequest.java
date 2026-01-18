package com.flowlet.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

/**
 * 流程执行请求
 */
@Data
public class ProcessRequest {

    /**
     * 流程ID
     */
    @NotBlank(message = "流程ID不能为空")
    private String flowId;

    /**
     * 输入数据
     */
    private Map<String, Object> inputs;

    /**
     * 指定执行版本（可选，默认最新发布版本）
     */
    private Integer flowVersion;
}
