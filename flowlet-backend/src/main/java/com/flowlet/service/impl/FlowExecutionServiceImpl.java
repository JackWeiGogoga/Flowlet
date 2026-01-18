package com.flowlet.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.DebugRequest;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.dto.ProcessRequest;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.FlowEngine;
import com.flowlet.entity.AsyncCallback;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowExecution;
import com.flowlet.entity.NodeExecution;
import com.flowlet.enums.ExecutionStatus;
import com.flowlet.enums.FlowStatus;
import com.flowlet.enums.NodeExecutionStatus;
import com.flowlet.mapper.AsyncCallbackMapper;
import com.flowlet.mapper.FlowDefinitionMapper;
import com.flowlet.mapper.FlowExecutionMapper;
import com.flowlet.mapper.NodeExecutionMapper;
import com.flowlet.service.ConstantDefinitionService;
import com.flowlet.service.FlowAsyncExecutor;
import com.flowlet.service.FlowDefinitionService;
import com.flowlet.service.FlowExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 流程执行服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowExecutionServiceImpl implements FlowExecutionService {

    private final FlowDefinitionMapper flowDefinitionMapper;
    private final FlowDefinitionService flowDefinitionService;
    private final FlowExecutionMapper flowExecutionMapper;
    private final NodeExecutionMapper nodeExecutionMapper;
    private final AsyncCallbackMapper asyncCallbackMapper;
    private final FlowAsyncExecutor flowAsyncExecutor;
    private final FlowEngine flowEngine;
    private final ObjectMapper objectMapper;
    private final ConstantDefinitionService constantDefinitionService;

    @Override
    @Transactional
    public FlowExecution execute(ProcessRequest request) {
        log.info("开始执行流程: flowId={}", request.getFlowId());

        FlowDefinition baseFlow = flowDefinitionMapper.selectById(request.getFlowId());
        if (baseFlow == null) {
            throw new RuntimeException("流程定义不存在: " + request.getFlowId());
        }
        if (FlowStatus.DISABLED.getValue().equals(baseFlow.getStatus())) {
            throw new RuntimeException("流程已禁用，无法执行");
        }

        FlowDefinition flowDefinition = flowDefinitionService.getPublishedFlow(
                request.getFlowId(),
                request.getFlowVersion()
        );
        if (flowDefinition == null) {
            throw new RuntimeException("流程未发布，无法执行");
        }

        // 创建执行实例
        FlowExecution execution = new FlowExecution();
        execution.setProjectId(flowDefinition.getProjectId());
        execution.setFlowId(flowDefinition.getId());
        execution.setFlowVersion(flowDefinition.getVersion());
        execution.setStatus(ExecutionStatus.PENDING.getValue());
        execution.setCreatedAt(LocalDateTime.now());
        execution.setUpdatedAt(LocalDateTime.now());

        // 保存输入数据
        if (request.getInputs() != null) {
            try {
                execution.setInputData(objectMapper.writeValueAsString(request.getInputs()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("序列化输入数据失败", e);
            }
        }

        flowExecutionMapper.insert(execution);
        log.info("创建执行实例: executionId={}, projectId={}", execution.getId(), execution.getProjectId());

        // 通过独立的异步执行器来执行流程
        flowAsyncExecutor.executeAsync(execution.getId(), flowDefinition, request.getInputs());

        return execution;
    }

    @Override
    @Transactional
    public FlowExecution debug(DebugRequest request) {
        log.info("开始调试执行流程: flowId={}, flowName={}", request.getFlowId(), request.getFlowName());

        FlowDefinition flowDefinitionToUse;
        String graphDataJson;
        
        try {
            graphDataJson = objectMapper.writeValueAsString(request.getGraphData());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化流程图数据失败", e);
        }

        // 判断如何处理流程定义
        if (request.getFlowId() != null) {
            FlowDefinition existingFlow = flowDefinitionMapper.selectById(request.getFlowId());
            
            if (existingFlow != null && FlowStatus.DRAFT.getValue().equals(existingFlow.getStatus())) {
                // 草稿状态：直接更新草稿内容，使用现有记录
                log.info("流程为草稿状态，更新草稿内容: flowId={}", request.getFlowId());
                existingFlow.setGraphData(graphDataJson);
                existingFlow.setUpdatedAt(LocalDateTime.now());
                flowDefinitionMapper.updateById(existingFlow);
                flowDefinitionToUse = existingFlow;
            } else {
                // 已发布/已禁用/不存在：创建独立的调试记录，不影响线上
                log.info("流程为非草稿状态或不存在，创建独立调试记录: flowId={}", request.getFlowId());
                // 优先使用请求中的 projectId，否则从现有流程获取
                String projectIdToUse = request.getProjectId();
                if (projectIdToUse == null && existingFlow != null) {
                    projectIdToUse = existingFlow.getProjectId();
                }
                // 传递原始流程ID，用于获取流程级常量
                flowDefinitionToUse = createDebugFlowDefinition(request.getFlowName(), graphDataJson, projectIdToUse, request.getFlowId());
            }
        } else {
            // 没有flowId：创建独立的调试记录
            log.info("未提供flowId，创建独立调试记录");
            flowDefinitionToUse = createDebugFlowDefinition(request.getFlowName(), graphDataJson, request.getProjectId(), null);
        }

        // 创建执行实例
        FlowExecution execution = new FlowExecution();
        execution.setProjectId(flowDefinitionToUse.getProjectId());
        execution.setFlowId(flowDefinitionToUse.getId());
        execution.setFlowVersion(flowDefinitionToUse.getVersion());
        execution.setStatus(ExecutionStatus.PENDING.getValue());
        execution.setCreatedAt(LocalDateTime.now());
        execution.setUpdatedAt(LocalDateTime.now());

        // 保存输入数据
        if (request.getInputs() != null) {
            try {
                execution.setInputData(objectMapper.writeValueAsString(request.getInputs()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("序列化输入数据失败", e);
            }
        }

        flowExecutionMapper.insert(execution);
        log.info("创建调试执行实例: executionId={}, flowId={}, projectId={}, isDebugRecord={}", 
                execution.getId(), flowDefinitionToUse.getId(), execution.getProjectId(),
                FlowStatus.DEBUG.getValue().equals(flowDefinitionToUse.getStatus()));

        // 通过独立的异步执行器来执行流程
        flowAsyncExecutor.executeAsync(execution.getId(), flowDefinitionToUse, request.getInputs());

        return execution;
    }

    /**
     * 创建独立的调试流程定义记录
     */
    private FlowDefinition createDebugFlowDefinition(String flowName, String graphDataJson, String projectId, String originalFlowId) {
        FlowDefinition debugFlowDefinition = new FlowDefinition();
        debugFlowDefinition.setName("[调试] " + (flowName != null ? flowName : "未命名流程"));
        debugFlowDefinition.setDescription("调试执行生成的临时流程定义");
        debugFlowDefinition.setVersion(1);
        debugFlowDefinition.setStatus(FlowStatus.DEBUG.getValue());
        debugFlowDefinition.setGraphData(graphDataJson);
        debugFlowDefinition.setProjectId(projectId);  // 设置项目ID，用于获取项目级常量
        debugFlowDefinition.setOriginalFlowId(originalFlowId);  // 设置原始流程ID，用于获取流程级常量
        debugFlowDefinition.setCreatedAt(LocalDateTime.now());
        debugFlowDefinition.setUpdatedAt(LocalDateTime.now());
        
        flowDefinitionMapper.insert(debugFlowDefinition);
        log.info("创建调试流程定义: flowId={}, projectId={}, originalFlowId={}", debugFlowDefinition.getId(), projectId, originalFlowId);
        return debugFlowDefinition;
    }

    @Override
    public FlowExecution getExecution(String executionId) {
        return flowExecutionMapper.selectById(executionId);
    }

    @Override
    @Transactional
    public void handleCallback(String callbackKey, Map<String, Object> callbackData) {
        log.info("========== 开始处理回调 ==========");
        log.info("处理回调: callbackKey={}, callbackData={}", callbackKey, callbackData);

        // 查找回调记录
        LambdaQueryWrapper<AsyncCallback> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncCallback::getCallbackKey, callbackKey)
                .eq(AsyncCallback::getStatus, "waiting");

        AsyncCallback callback = asyncCallbackMapper.selectOne(wrapper);
        if (callback == null) {
            log.warn("未找到待处理的回调记录: callbackKey={}", callbackKey);
            log.warn("可能原因: 1.callbackKey不正确 2.回调已被处理 3.回调记录不存在");
            return;
        }
        log.info("找到回调记录: executionId={}, nodeExecutionId={}", 
                callback.getExecutionId(), callback.getNodeExecutionId());

        // 检查是否过期
        if (callback.getExpiredAt() != null && callback.getExpiredAt().isBefore(LocalDateTime.now())) {
            log.warn("回调已过期: callbackKey={}, expiredAt={}", callbackKey, callback.getExpiredAt());
            callback.setStatus("expired");
            asyncCallbackMapper.updateById(callback);
            return;
        }

        // 更新回调状态
        log.info("更新回调状态为 received");
        callback.setStatus("received");
        callback.setReceivedAt(LocalDateTime.now());
        if (callbackData != null) {
            try {
                callback.setCallbackData(objectMapper.writeValueAsString(callbackData));
            } catch (JsonProcessingException e) {
                log.warn("序列化回调数据失败: {}", e.getMessage());
            }
        }
        asyncCallbackMapper.updateById(callback);

        // 更新节点执行状态
        NodeExecution nodeExecution = nodeExecutionMapper.selectById(callback.getNodeExecutionId());
        if (nodeExecution != null) {
            log.info("更新节点执行状态: nodeExecutionId={}, 当前状态={}", 
                    nodeExecution.getId(), nodeExecution.getStatus());
            nodeExecution.setStatus(NodeExecutionStatus.COMPLETED.getValue());
            nodeExecution.setCompletedAt(LocalDateTime.now());
            nodeExecution.setUpdatedAt(LocalDateTime.now());
            
            // 构建完整的输出数据，包含执行过程信息和回调数据
            try {
                Map<String, Object> fullOutput = new HashMap<>();
                
                // 如果有执行过程数据，将其包含在输出中
                if (nodeExecution.getExecutionData() != null) {
                    Map<String, Object> executionData = objectMapper.readValue(
                            nodeExecution.getExecutionData(), new TypeReference<Map<String, Object>>() {});
                    fullOutput.put("request", executionData.get("request"));
                    fullOutput.put("syncResponse", executionData.get("response"));
                    fullOutput.put("callbackInfo", executionData.get("callbackInfo"));
                }
                
                // 添加回调数据
                if (callbackData != null) {
                    fullOutput.put("callbackData", callbackData);
                }
                
                nodeExecution.setOutputData(objectMapper.writeValueAsString(fullOutput));
            } catch (JsonProcessingException e) {
                log.warn("序列化节点输出失败: {}", e.getMessage());
                // 降级：只保存回调数据
                if (callbackData != null) {
                    try {
                        nodeExecution.setOutputData(objectMapper.writeValueAsString(callbackData));
                    } catch (JsonProcessingException ex) {
                        log.warn("序列化回调数据失败: {}", ex.getMessage());
                    }
                }
            }
            
            nodeExecutionMapper.updateById(nodeExecution);
            log.info("节点执行状态已更新为 COMPLETED");
        } else {
            log.warn("未找到节点执行记录: nodeExecutionId={}", callback.getNodeExecutionId());
        }

        // 恢复流程执行
        log.info("准备恢复流程执行: executionId={}", callback.getExecutionId());
        resumeExecution(callback.getExecutionId());

        // 更新回调状态为已处理
        callback.setStatus("processed");
        asyncCallbackMapper.updateById(callback);
        log.info("回调处理完成: callbackKey={}, status=processed", callbackKey);
        log.info("========== 回调处理结束 ==========");
    }

    @Override
    @Transactional
    public void resumeExecution(String executionId) {
        log.info("---------- 恢复执行开始 ----------");
        log.info("恢复执行: executionId={}", executionId);

        FlowExecution execution = flowExecutionMapper.selectById(executionId);
        if (execution == null) {
            log.error("执行实例不存在: {}", executionId);
            throw new RuntimeException("执行实例不存在: " + executionId);
        }
        log.info("找到执行实例: status={}, currentNodeId={}, flowId={}", 
                execution.getStatus(), execution.getCurrentNodeId(), execution.getFlowId());

        if (!ExecutionStatus.PAUSED.getValue().equals(execution.getStatus())) {
            log.warn("执行实例状态不是暂停，无法恢复: status={}", execution.getStatus());
            return;
        }

        // 获取流程定义
        FlowDefinition flowDefinition = flowDefinitionMapper.selectById(execution.getFlowId());
        if (flowDefinition == null) {
            throw new RuntimeException("流程定义不存在: " + execution.getFlowId());
        }

        try {
            // 解析流程图数据
            FlowGraphDTO flowGraph = objectMapper.readValue(
                    flowDefinition.getGraphData(), FlowGraphDTO.class);

            // 恢复执行上下文
            ExecutionContext context = new ExecutionContext();
            context.setExecutionId(executionId);
            context.setFlowId(flowDefinition.getId());
            context.setFlowGraph(flowGraph);
            context.setCurrentNodeId(execution.getCurrentNodeId());

            // 恢复输入数据
            if (execution.getInputData() != null) {
                Map<String, Object> inputs = objectMapper.readValue(
                        execution.getInputData(), new TypeReference<Map<String, Object>>() {});
                context.setInputs(inputs);
            }

            // 恢复上下文数据
            if (execution.getContextData() != null) {
                Map<String, Object> contextData = objectMapper.readValue(
                        execution.getContextData(), new TypeReference<Map<String, Object>>() {});
                context.fromSerializable(contextData);
            }

            if (context.getAllConstants().isEmpty()) {
                context.setConstants(
                        constantDefinitionService.getAvailableConstantMap(
                                flowDefinition.getProjectId(),
                                flowDefinition.getId()
                        )
                );
            }

            // 获取最新的回调数据
            Map<String, Object> callbackData = getLatestCallbackData(executionId, execution.getCurrentNodeId());

            // 继续执行
            flowEngine.resumeExecution(context, execution.getCurrentNodeId(), callbackData);

        } catch (Exception e) {
            log.error("恢复执行失败: executionId={}, error={}", executionId, e.getMessage(), e);

            execution.setStatus(ExecutionStatus.FAILED.getValue());
            execution.setErrorMessage("恢复执行失败: " + e.getMessage());
            execution.setUpdatedAt(LocalDateTime.now());
            flowExecutionMapper.updateById(execution);
        }
    }

    /**
     * 获取最新的回调数据
     */
    private Map<String, Object> getLatestCallbackData(String executionId, String nodeId) {
        // 查找该节点的最新回调记录
        LambdaQueryWrapper<NodeExecution> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(NodeExecution::getExecutionId, executionId)
                .eq(NodeExecution::getNodeId, nodeId)
                .orderByDesc(NodeExecution::getCreatedAt)
                .last("LIMIT 1");

        NodeExecution nodeExecution = nodeExecutionMapper.selectOne(wrapper);
        if (nodeExecution != null && nodeExecution.getOutputData() != null) {
            try {
                return objectMapper.readValue(
                        nodeExecution.getOutputData(), new TypeReference<Map<String, Object>>() {});
            } catch (JsonProcessingException e) {
                log.warn("解析节点输出失败: {}", e.getMessage());
            }
        }

        return new HashMap<>();
    }
}
