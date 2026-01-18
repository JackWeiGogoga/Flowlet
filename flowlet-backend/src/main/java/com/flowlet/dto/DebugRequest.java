package com.flowlet.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * 调试执行请求 - 直接使用流程图数据，无需先发布
 */
@Data
public class DebugRequest {

    /**
     * 流程定义ID（可选）
     * - 如果提供且流程是草稿状态，会自动保存最新内容再执行
     * - 如果流程已发布/禁用，会创建独立的调试记录
     * - 如果不提供，总是创建独立的调试记录
     */
    private String flowId;

    /**
     * 流程图数据（与保存的 graphData 格式一致）
     */
    @NotNull(message = "流程图数据不能为空")
    private FlowGraphDTO graphData;

    /**
     * 输入数据
     */
    private Map<String, Object> inputs;

    /**
     * 流程名称（用于日志和显示）
     */
    private String flowName;

    /**
     * 项目ID（可选）
     * - 用于获取项目级常量
     * - 如果流程已发布，创建独立调试记录时需要关联到项目
     */
    private String projectId;
}
