package com.flowlet.engine.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.engine.FlowEngine;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowExecution;
import com.flowlet.enums.ExecutionStatus;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.FlowExecutionMapper;
import com.flowlet.service.FlowDefinitionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 子流程节点处理器
 * 负责执行另一个流程作为当前流程的一部分
 */
@Slf4j
@Component
public class SubflowNodeHandler implements NodeHandler {

    private final FlowDefinitionService flowDefinitionService;
    private final FlowExecutionMapper flowExecutionMapper;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<FlowEngine> flowEngineProvider;
    private final ExpressionResolver expressionResolver;

    public SubflowNodeHandler(FlowDefinitionService flowDefinitionService,
                               FlowExecutionMapper flowExecutionMapper,
                               ObjectMapper objectMapper,
                               ObjectProvider<FlowEngine> flowEngineProvider,
                               ExpressionResolver expressionResolver) {
        this.flowDefinitionService = flowDefinitionService;
        this.flowExecutionMapper = flowExecutionMapper;
        this.objectMapper = objectMapper;
        this.flowEngineProvider = flowEngineProvider;
        this.expressionResolver = expressionResolver;
    }

    /**
     * 延迟获取 FlowEngine，避免循环依赖
     */
    private FlowEngine getFlowEngine() {
        return flowEngineProvider.getObject();
    }

    @Override
    public String getNodeType() {
        return NodeType.SUBFLOW.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("开始执行子流程节点: nodeId={}", node.getId());
        
        Map<String, Object> config = node.getData().getConfig();
        if (config == null) {
            return NodeResult.fail("子流程节点配置为空");
        }

        // 获取子流程ID
        String subflowId = (String) config.get("subflowId");
        if (subflowId == null || subflowId.isEmpty()) {
            return NodeResult.fail("未指定要调用的子流程");
        }

        // ========== 运行时循环依赖检测 ==========
        List<String> callChain = context.getCallChain();
        if (callChain == null) {
            callChain = new ArrayList<>();
        }
        
        // 检查当前流程是否已在调用链中
        String currentFlowId = context.getFlowId();
        if (currentFlowId != null && !callChain.contains(currentFlowId)) {
            callChain = new ArrayList<>(callChain);
            callChain.add(currentFlowId);
        }
        
        if (callChain.contains(subflowId)) {
            String chainStr = String.join(" -> ", callChain) + " -> " + subflowId;
            String errorMsg = "检测到循环调用: " + chainStr;
            log.error(errorMsg);
            return NodeResult.fail(errorMsg);
        }

        // ========== 加载子流程定义（已发布版本） ==========
        FlowDefinition subflowDefinition = flowDefinitionService.getPublishedFlow(subflowId, null);
        if (subflowDefinition == null) {
            return NodeResult.fail("子流程不存在: " + subflowId);
        }

        if (!Boolean.TRUE.equals(subflowDefinition.getIsReusable())) {
            log.warn("调用的流程未标记为可复用: flowId={}, flowName={}", 
                    subflowId, subflowDefinition.getName());
        }

        // 解析子流程图结构
        FlowGraphDTO subflowGraph;
        try {
            subflowGraph = objectMapper.readValue(
                    subflowDefinition.getGraphData(), 
                    FlowGraphDTO.class
            );
        } catch (Exception e) {
            log.error("解析子流程图结构失败: subflowId={}", subflowId, e);
            return NodeResult.fail("解析子流程图结构失败: " + e.getMessage());
        }

        // ========== 构建子流程输入参数 ==========
        Map<String, Object> subflowInputs = buildSubflowInputs(config, context, subflowGraph);
        log.debug("子流程输入参数: {}", subflowInputs);

        // ========== 创建子流程执行记录 ==========
        FlowExecution subExecution = createSubflowExecution(
                subflowId, 
                context.getExecutionId(), 
                node.getId(),
                subflowInputs,
                subflowDefinition
        );

        // ========== 创建子流程执行上下文 ==========
        ExecutionContext subContext = new ExecutionContext(
                subExecution.getId(), 
                subflowGraph, 
                subflowInputs
        );
        subContext.setFlowId(subflowId);
        
        // 传递并更新调用链
        List<String> newCallChain = new ArrayList<>(callChain);
        newCallChain.add(subflowId);
        subContext.setCallChain(newCallChain);

        // ========== 同步执行子流程 ==========
        log.info("开始执行子流程: subExecutionId={}, subflowId={}, subflowName={}", 
                subExecution.getId(), subflowId, subflowDefinition.getName());
        
        try {
            getFlowEngine().execute(subContext);
            
            // 获取子流程执行结果
            FlowExecution completedExecution = flowExecutionMapper.selectById(subExecution.getId());
            
            if (ExecutionStatus.COMPLETED.getValue().equals(completedExecution.getStatus())) {
                // 子流程成功完成，提取输出（扁平化展开结束节点定义的输出变量）
                Map<String, Object> subflowOutputs = extractSubflowOutputs(completedExecution, subContext, subflowGraph);
                log.info("子流程执行成功: subExecutionId={}, outputs={}", subExecution.getId(), subflowOutputs.keySet());
                
                // 将子流程输出添加到当前上下文
                String outputVarName = getOutputVariableName(config, node);
                context.setVariable(outputVarName, subflowOutputs);
                
                return NodeResult.success(subflowOutputs);
                
            } else if (ExecutionStatus.FAILED.getValue().equals(completedExecution.getStatus())) {
                String errorMsg = completedExecution.getErrorMessage();
                log.error("子流程执行失败: subExecutionId={}, error={}", subExecution.getId(), errorMsg);
                return NodeResult.fail("子流程执行失败: " + errorMsg);
                
            } else if (ExecutionStatus.PAUSED.getValue().equals(completedExecution.getStatus())) {
                // 子流程处于等待状态（如等待人工审批）
                log.info("子流程进入等待状态: subExecutionId={}", subExecution.getId());
                return NodeResult.waiting("子流程等待中", Map.of(
                        "subExecutionId", subExecution.getId(),
                        "subflowId", subflowId
                ));
            } else {
                return NodeResult.fail("子流程处于未知状态: " + completedExecution.getStatus());
            }
            
        } catch (Exception e) {
            log.error("子流程执行异常: subExecutionId={}", subExecution.getId(), e);
            
            // 更新子流程执行状态为失败
            subExecution.setStatus(ExecutionStatus.FAILED.getValue());
            subExecution.setErrorMessage(e.getMessage());
            subExecution.setCompletedAt(LocalDateTime.now());
            flowExecutionMapper.updateById(subExecution);
            
            return NodeResult.fail("子流程执行异常: " + e.getMessage());
        }
    }

    /**
     * 构建子流程输入参数
     * 根据配置的变量映射，从当前上下文中提取值传递给子流程
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> buildSubflowInputs(
            Map<String, Object> config,
            ExecutionContext context,
            FlowGraphDTO subflowGraph
    ) {
        Map<String, Object> inputs = new HashMap<>();
        
        // 获取变量映射配置
        Object inputMappingsObj = config.get("inputMappings");
        if (inputMappingsObj == null) {
            return inputs;
        }

        List<Map<String, String>> inputMappings;
        try {
            if (inputMappingsObj instanceof List) {
                inputMappings = (List<Map<String, String>>) inputMappingsObj;
            } else {
                inputMappings = objectMapper.convertValue(
                        inputMappingsObj, 
                        new TypeReference<List<Map<String, String>>>() {}
                );
            }
        } catch (Exception e) {
            log.warn("解析输入映射配置失败: {}", e.getMessage());
            return inputs;
        }

        // 处理每个映射
        for (Map<String, String> mapping : inputMappings) {
            // 支持两种字段名：targetVariable (前端使用) 和 targetParam (兼容)
            String targetVariable = mapping.get("targetVariable");
            if (targetVariable == null) {
                targetVariable = mapping.get("targetParam");
            }
            String sourceExpression = mapping.get("sourceExpression");
            
            if (targetVariable == null || targetVariable.isEmpty()) {
                log.debug("跳过无效的输入映射: 目标变量为空");
                continue;
            }
            
            if (sourceExpression == null || sourceExpression.isEmpty()) {
                log.debug("跳过无效的输入映射: 来源表达式为空, targetVariable={}", targetVariable);
                continue;
            }

            try {
                Object value = resolveExpression(sourceExpression, context);
                inputs.put(targetVariable, value);
                log.debug("输入映射成功: {} = {}", targetVariable, value);
            } catch (Exception e) {
                log.warn("解析输入映射表达式失败: targetVariable={}, expression={}, error={}", 
                        targetVariable, sourceExpression, e.getMessage());
            }
        }

        applyDefaultInputs(inputs, subflowGraph);
        return inputs;
    }

    private void applyDefaultInputs(Map<String, Object> inputs, FlowGraphDTO subflowGraph) {
        if (subflowGraph == null || subflowGraph.getNodes() == null) {
            return;
        }

        FlowGraphDTO.NodeDTO startNode = subflowGraph.getNodes().stream()
                .filter(node -> node != null
                        && node.getData() != null
                        && NodeType.START.getValue().equals(node.getData().getNodeType()))
                .findFirst()
                .orElse(null);
        if (startNode == null || startNode.getData() == null) {
            return;
        }

        Map<String, Object> startConfig = startNode.getData().getConfig();
        if (startConfig == null) {
            return;
        }

        Object variablesObj = startConfig.get("variables");
        if (!(variablesObj instanceof List)) {
            return;
        }

        List<Map<String, Object>> variables =
                objectMapper.convertValue(variablesObj, new TypeReference<List<Map<String, Object>>>() {});

        for (Map<String, Object> variable : variables) {
            Object nameObj = variable.get("name");
            if (!(nameObj instanceof String)) {
                continue;
            }
            String name = ((String) nameObj).trim();
            if (name.isEmpty() || inputs.containsKey(name)) {
                continue;
            }

            Object defaultValue = variable.get("defaultValue");
            if (defaultValue == null || "".equals(defaultValue)) {
                continue;
            }

            String type = variable.get("type") != null
                    ? String.valueOf(variable.get("type"))
                    : "";

            inputs.put(name, normalizeDefaultValue(defaultValue, type));
        }
    }

    private Object normalizeDefaultValue(Object defaultValue, String type) {
        if (defaultValue == null || type == null) {
            return defaultValue;
        }

        if ("number".equals(type)) {
            if (defaultValue instanceof Number) {
                return defaultValue;
            }
            String value = String.valueOf(defaultValue).trim();
            if (value.isEmpty()) {
                return null;
            }
            try {
                return value.contains(".") ? Double.parseDouble(value) : Long.parseLong(value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }

        if ("structure".equals(type)) {
            if (defaultValue instanceof Map || defaultValue instanceof List) {
                return defaultValue;
            }
            String value = String.valueOf(defaultValue).trim();
            if (value.isEmpty()) {
                return null;
            }
            try {
                return objectMapper.readValue(value, Object.class);
            } catch (Exception e) {
                return defaultValue;
            }
        }

        return defaultValue;
    }

    /**
     * 解析表达式获取值
     * 使用统一的表达式解析器
     */
    private Object resolveExpression(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }
        return expressionResolver.resolve(expression, context);
    }

    /**
     * 创建子流程执行记录
     */
    private FlowExecution createSubflowExecution(
            String subflowId, 
            String parentExecutionId,
            String parentNodeId,
            Map<String, Object> inputs,
            FlowDefinition subflowDefinition) {
        
        FlowExecution execution = new FlowExecution();
        execution.setId(UUID.randomUUID().toString());
        execution.setProjectId(subflowDefinition.getProjectId()); // 设置项目ID
        execution.setFlowId(subflowId);
        execution.setFlowVersion(subflowDefinition.getVersion()); // 设置流程版本
        execution.setStatus(ExecutionStatus.RUNNING.getValue());
        execution.setStartedAt(LocalDateTime.now());
        execution.setCreatedAt(LocalDateTime.now());
        execution.setUpdatedAt(LocalDateTime.now());
        execution.setParentExecutionId(parentExecutionId);
        execution.setParentNodeExecutionId(parentNodeId);
        
        try {
            execution.setInputData(objectMapper.writeValueAsString(inputs));
        } catch (Exception e) {
            log.warn("序列化子流程输入失败: {}", e.getMessage());
            execution.setInputData("{}");
        }

        flowExecutionMapper.insert(execution);
        log.debug("创建子流程执行记录: executionId={}, subflowId={}, projectId={}, version={}", 
                execution.getId(), subflowId, subflowDefinition.getProjectId(), subflowDefinition.getVersion());
        
        return execution;
    }

    /**
     * 提取子流程输出
     * 直接扁平化展开结束节点定义的输出变量，同时添加元数据字段
     */
    private Map<String, Object> extractSubflowOutputs(
            FlowExecution execution, 
            ExecutionContext subContext,
            FlowGraphDTO subflowGraph) {
        Map<String, Object> outputs = new HashMap<>();
        
        // 1. 添加元数据字段（以下划线开头）
        outputs.put("_executionId", execution.getId());
        outputs.put("_status", execution.getStatus());
        
        // 2. 从子流程结束节点获取定义的输出变量
        FlowGraphDTO.NodeDTO endNode = findExecutedEndNode(subflowGraph, subContext);
        if (endNode != null && endNode.getData().getConfig() != null) {
            Map<String, Object> endConfig = endNode.getData().getConfig();
            
            // 获取结束节点配置的输出变量列表
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> outputVariables = (List<Map<String, Object>>) endConfig.get("outputVariables");
            
            if (outputVariables != null && !outputVariables.isEmpty()) {
                // 从上下文中提取结束节点定义的输出变量值
                for (Map<String, Object> varDef : outputVariables) {
                    String varName = (String) varDef.get("name");
                    // 前端使用 "expression" 字段存储来源表达式
                    String sourceExpression = (String) varDef.get("expression");
                    
                    if (varName != null && !varName.isEmpty()) {
                        Object value = null;
                        
                        // 如果有来源表达式，解析它
                        if (sourceExpression != null && !sourceExpression.isEmpty()) {
                            value = resolveExpressionFromSubContext(sourceExpression, subContext);
                        }
                        
                        outputs.put(varName, value);
                        log.debug("提取子流程输出变量: {} = {} (expression={})", varName, value, sourceExpression);
                    }
                }
            } else {
                // 如果结束节点没有定义输出变量，尝试从执行记录的 outputData 获取
                String outputsJson = execution.getOutputData();
                if (outputsJson != null && !outputsJson.isEmpty()) {
                    try {
                        Map<String, Object> savedOutputs = objectMapper.readValue(
                                outputsJson, 
                                new TypeReference<Map<String, Object>>() {}
                        );
                        // 过滤掉内部字段，只保留用户定义的输出
                        for (Map.Entry<String, Object> entry : savedOutputs.entrySet()) {
                            String key = entry.getKey();
                            if (!key.startsWith("_") && !key.equals("status") && !key.equals("message")) {
                                outputs.put(key, entry.getValue());
                            }
                        }
                    } catch (Exception e) {
                        log.warn("解析子流程输出数据失败: {}", e.getMessage());
                    }
                }
            }
        }
        
        // 3. 如果上面都没有获取到输出，尝试从 outputs 字段获取
        String outputsJson = execution.getOutputData();
        if (outputsJson != null && !outputsJson.isEmpty()) {
            try {
                Map<String, Object> savedData = objectMapper.readValue(
                        outputsJson, 
                        new TypeReference<Map<String, Object>>() {}
                );
                // 检查是否有 outputs 字段（某些情况下输出存在这里）
                if (savedData.containsKey("outputs") && savedData.get("outputs") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> nestedOutputs = (Map<String, Object>) savedData.get("outputs");
                    for (Map.Entry<String, Object> entry : nestedOutputs.entrySet()) {
                        String key = entry.getKey();
                        // 不覆盖已有的字段和元数据字段
                        if (!outputs.containsKey(key) && !key.startsWith("_")) {
                            outputs.put(key, entry.getValue());
                        }
                    }
                }
            } catch (Exception e) {
                // 忽略解析错误
            }
        }
        
        return outputs;
    }
    
    /**
     * 查找流程图中的结束节点
     */
    private FlowGraphDTO.NodeDTO findExecutedEndNode(FlowGraphDTO graph, ExecutionContext context) {
        if (graph == null || graph.getNodes() == null) {
            return null;
        }

        if (context != null && context.getCurrentNodeId() != null) {
            String currentNodeId = context.getCurrentNodeId();
            for (FlowGraphDTO.NodeDTO node : graph.getNodes()) {
                if (node.getData() != null &&
                        "end".equals(node.getData().getNodeType()) &&
                        currentNodeId.equals(node.getId())) {
                    return node;
                }
            }
        }

        for (FlowGraphDTO.NodeDTO node : graph.getNodes()) {
            if (node.getData() != null && "end".equals(node.getData().getNodeType())) {
                return node;
            }
        }
        return null;
    }
    
    /**
     * 从子流程上下文解析表达式
     * 使用统一的表达式解析器
     */
    private Object resolveExpressionFromSubContext(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }
        return expressionResolver.resolve(expression, context);
    }

    /**
     * 获取输出变量名
     */
    private String getOutputVariableName(Map<String, Object> config, FlowGraphDTO.NodeDTO node) {
        // 优先使用配置的输出变量名
        String outputVar = (String) config.get("outputVariableName");
        if (outputVar != null && !outputVar.isEmpty()) {
            return outputVar;
        }
        
        // 使用节点标签名
        String label = node.getData().getLabel();
        if (label != null && !label.isEmpty()) {
            // 将标签转换为有效的变量名（移除空格等特殊字符）
            String sanitizedLabel = label.replaceAll("[^a-zA-Z0-9_]", "_");
            return sanitizedLabel + "_output";
        }
        
        // 使用节点ID
        return "subflow_" + node.getId() + "_output";
    }
}
