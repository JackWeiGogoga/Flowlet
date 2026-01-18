package com.flowlet.service;

import com.flowlet.dto.DebugRequest;
import com.flowlet.dto.ProcessRequest;
import com.flowlet.entity.FlowExecution;

import java.util.Map;

/**
 * 流程执行服务接口
 */
public interface FlowExecutionService {

    /**
     * 执行流程（需要已发布的流程）
     *
     * @param request 执行请求
     * @return 执行实例
     */
    FlowExecution execute(ProcessRequest request);

    /**
     * 调试执行流程（直接使用传入的流程图数据，无需发布）
     *
     * @param request 调试请求
     * @return 执行实例
     */
    FlowExecution debug(DebugRequest request);

    /**
     * 获取执行实例详情
     *
     * @param executionId 执行实例ID
     * @return 执行实例
     */
    FlowExecution getExecution(String executionId);

    /**
     * 处理异步回调
     *
     * @param callbackKey 回调唯一标识
     * @param callbackData 回调数据
     */
    void handleCallback(String callbackKey, Map<String, Object> callbackData);

    /**
     * 恢复暂停的执行
     *
     * @param executionId 执行实例ID
     */
    void resumeExecution(String executionId);
}
