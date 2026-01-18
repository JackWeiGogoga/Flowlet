package com.flowlet.dto;

import lombok.Data;

import java.util.Map;

/**
 * 单节点调试结果
 */
@Data
public class NodeDebugResult {

    /**
     * 是否成功
     */
    private boolean success;

    /**
     * 错误消息（失败时）
     */
    private String errorMessage;

    /**
     * 节点输出数据
     */
    private Map<String, Object> output;

    /**
     * 执行耗时（毫秒）
     */
    private Long duration;

    /**
     * 请求详情（用于调试）
     */
    private Map<String, Object> requestDetails;

    /**
     * 原始响应（API 节点专用）
     */
    private Object rawResponse;

    public static NodeDebugResult success(Map<String, Object> output, Long duration) {
        NodeDebugResult result = new NodeDebugResult();
        result.setSuccess(true);
        result.setOutput(output);
        result.setDuration(duration);
        return result;
    }

    public static NodeDebugResult fail(String errorMessage, Long duration) {
        NodeDebugResult result = new NodeDebugResult();
        result.setSuccess(false);
        result.setErrorMessage(errorMessage);
        result.setDuration(duration);
        return result;
    }
}
