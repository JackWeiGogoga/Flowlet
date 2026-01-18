package com.flowlet.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 流程定义请求
 */
@Data
public class FlowDefinitionRequest {

    /**
     * 流程名称
     */
    @NotBlank(message = "流程名称不能为空")
    private String name;

    /**
     * 流程描述
     */
    private String description;

    /**
     * 流程图数据
     */
    private FlowGraphDTO graphData;

    /**
     * 输入参数的 JSON Schema
     */
    private String inputSchema;
}
