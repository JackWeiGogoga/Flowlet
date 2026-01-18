package com.flowlet.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * 单节点调试请求
 * 用于单独执行某个节点，方便调试
 */
@Data
public class NodeDebugRequest {

    /**
     * 节点数据
     */
    @NotNull(message = "节点数据不能为空")
    private FlowGraphDTO.NodeDTO node;

    /**
     * 模拟的输入数据（模拟前序节点的输出）
     */
    private Map<String, Object> mockInputs;

    /**
     * 执行超时时间（毫秒），默认 30000
     */
    private Long timeout;
}
