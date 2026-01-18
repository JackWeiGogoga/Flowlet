package com.flowlet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.FlowEngine;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowExecution;
import com.flowlet.enums.ExecutionStatus;
import com.flowlet.mapper.FlowExecutionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 流程异步执行器
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowAsyncExecutor {

    private final FlowEngine flowEngine;
    private final FlowExecutionMapper flowExecutionMapper;
    private final ObjectMapper objectMapper;
    private final ConstantDefinitionService constantDefinitionService;

    /**
     * 异步执行流程
     */
    @Async
    public void executeAsync(String executionId, FlowDefinition flowDefinition, Map<String, Object> inputs) {
        log.info("开始异步执行流程: executionId={}", executionId);
        try {
            // 解析流程图数据
            FlowGraphDTO flowGraph = objectMapper.readValue(
                    flowDefinition.getGraphData(), FlowGraphDTO.class);

            // 构建执行上下文
            ExecutionContext context = new ExecutionContext();
            context.setExecutionId(executionId);
            context.setFlowId(flowDefinition.getId());
            context.setFlowGraph(flowGraph);
            if (inputs != null) {
                context.setInputs(inputs);
            }
            // 使用原始流程ID来查找流程级常量（调试模式下）
            String flowIdForConstants = flowDefinition.getOriginalFlowId() != null 
                    ? flowDefinition.getOriginalFlowId() 
                    : flowDefinition.getId();
            context.setConstants(
                    constantDefinitionService.getAvailableConstantMap(
                            flowDefinition.getProjectId(),
                            flowIdForConstants
                    )
            );

            // 执行流程
            flowEngine.execute(context);

        } catch (Exception e) {
            log.error("流程执行失败: executionId={}, error={}", executionId, e.getMessage(), e);

            // 更新执行状态为失败
            FlowExecution execution = flowExecutionMapper.selectById(executionId);
            if (execution != null) {
                execution.setStatus(ExecutionStatus.FAILED.getValue());
                execution.setErrorMessage(e.getMessage());
                execution.setUpdatedAt(LocalDateTime.now());
                flowExecutionMapper.updateById(execution);
            }
        }
    }
}
