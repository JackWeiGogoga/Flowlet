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
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Array;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * For-each 循环节点处理器
 * 对输入集合逐项执行子流程（串行/并行）
 */
@Slf4j
@Component
public class ForEachNodeHandler implements NodeHandler {

    private static final ExpressionParser SPEL_PARSER = new SpelExpressionParser();

    private final FlowDefinitionService flowDefinitionService;
    private final FlowExecutionMapper flowExecutionMapper;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<FlowEngine> flowEngineProvider;
    private final ExpressionResolver expressionResolver;

    private final Executor parallelExecutor = Executors.newCachedThreadPool();

    public ForEachNodeHandler(FlowDefinitionService flowDefinitionService,
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

    private FlowEngine getFlowEngine() {
        return flowEngineProvider.getObject();
    }

    @Override
    public String getNodeType() {
        return NodeType.FOR_EACH.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("开始执行 ForEach 节点: nodeId={}", node.getId());

        Map<String, Object> config = node.getData() != null ? node.getData().getConfig() : null;
        if (config == null) {
            return NodeResult.fail("ForEach 节点配置为空");
        }

        String itemsExpression = getString(config.get("itemsExpression"));
        if (itemsExpression == null || itemsExpression.isEmpty()) {
            return NodeResult.fail("未配置要迭代的数据来源");
        }

        String subflowId = getString(config.get("subflowId"));
        if (subflowId == null || subflowId.isEmpty()) {
            return NodeResult.fail("未配置子流程");
        }

        String mode = normalizeMode(getString(config.get("mode")));
        String itemVariable = normalizeVariableName(getString(config.get("itemVariable")), "item");
        String indexVariable = normalizeVariableName(getString(config.get("indexVariable")), "index");
        boolean continueOnError = Boolean.TRUE.equals(config.get("continueOnError"));

        FlowDefinition subflowDefinition = flowDefinitionService.getPublishedFlow(subflowId, null);
        if (subflowDefinition == null) {
            return NodeResult.fail("子流程不存在: " + subflowId);
        }

        FlowGraphDTO subflowGraph;
        try {
            subflowGraph = objectMapper.readValue(subflowDefinition.getGraphData(), FlowGraphDTO.class);
        } catch (Exception e) {
            log.error("解析子流程图结构失败: subflowId={}", subflowId, e);
            return NodeResult.fail("解析子流程图结构失败: " + e.getMessage());
        }

        Object itemsValue = resolveExpression(itemsExpression, context);
        List<Object> items = normalizeItems(itemsValue);
        if (items == null) {
            return NodeResult.fail("迭代数据必须是数组或列表");
        }

        if (items.isEmpty()) {
            return NodeResult.success(buildSummary(mode, 0, 0, 0, Collections.emptyList()));
        }

        if ("parallel".equals(mode)) {
            return executeParallel(items, context, node, config, subflowDefinition, subflowGraph,
                    itemVariable, indexVariable, continueOnError);
        }

        return executeSerial(items, context, node, config, subflowDefinition, subflowGraph,
                itemVariable, indexVariable, continueOnError);
    }

    private NodeResult executeSerial(List<Object> items,
                                     ExecutionContext context,
                                     FlowGraphDTO.NodeDTO node,
                                     Map<String, Object> config,
                                     FlowDefinition subflowDefinition,
                                     FlowGraphDTO subflowGraph,
                                     String itemVariable,
                                     String indexVariable,
                                     boolean continueOnError) {
        List<Map<String, Object>> results = new ArrayList<>();
        int failedCount = 0;

        for (int i = 0; i < items.size(); i++) {
            IterationResult result = executeSingleItem(
                    items.get(i), i, context, node, config, subflowDefinition, subflowGraph,
                    itemVariable, indexVariable
            );
            results.add(result.output);

            if (!result.success) {
                failedCount++;
                if (!continueOnError) {
                    return NodeResult.fail("第 " + (i + 1) + " 项执行失败: " + result.errorMessage);
                }
            }
        }

        int successCount = items.size() - failedCount;
        return NodeResult.success(buildSummary("serial", items.size(), successCount, failedCount, results));
    }

    private NodeResult executeParallel(List<Object> items,
                                       ExecutionContext context,
                                       FlowGraphDTO.NodeDTO node,
                                       Map<String, Object> config,
                                       FlowDefinition subflowDefinition,
                                       FlowGraphDTO subflowGraph,
                                       String itemVariable,
                                       String indexVariable,
                                       boolean continueOnError) {
        List<CompletableFuture<IterationResult>> futures = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            final int index = i;
            final Object item = items.get(i);
            futures.add(CompletableFuture.supplyAsync(
                    () -> executeSingleItem(
                            item, index, context, node, config, subflowDefinition, subflowGraph,
                            itemVariable, indexVariable
                    ),
                    parallelExecutor
            ));
        }

        List<IterationResult> results = futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());

        List<Map<String, Object>> outputResults = results.stream()
                .map(r -> r.output)
                .collect(Collectors.toList());

        List<IterationResult> failed = results.stream()
                .filter(r -> !r.success)
                .collect(Collectors.toList());

        if (!failed.isEmpty() && !continueOnError) {
            IterationResult first = failed.get(0);
            return NodeResult.fail("并行执行中存在失败项: " + first.errorMessage);
        }

        int successCount = items.size() - failed.size();
        return NodeResult.success(buildSummary("parallel", items.size(), successCount, failed.size(), outputResults));
    }

    private IterationResult executeSingleItem(Object item,
                                              int index,
                                              ExecutionContext context,
                                              FlowGraphDTO.NodeDTO node,
                                              Map<String, Object> config,
                                              FlowDefinition subflowDefinition,
                                              FlowGraphDTO subflowGraph,
                                              String itemVariable,
                                              String indexVariable) {
        StandardEvaluationContext evalContext = expressionResolver.buildEvaluationContext(context);
        if (itemVariable != null && !itemVariable.isEmpty()) {
            evalContext.setVariable(itemVariable, item);
        }
        if (indexVariable != null && !indexVariable.isEmpty()) {
            evalContext.setVariable(indexVariable, index);
        }

        Map<String, Object> subflowInputs = buildSubflowInputs(config, context, subflowGraph,
                item, index, itemVariable, indexVariable, evalContext);

        FlowExecution subExecution = createSubflowExecution(
                subflowDefinition.getId(),
                context.getExecutionId(),
                node.getId(),
                subflowInputs,
                subflowDefinition
        );

        ExecutionContext subContext = new ExecutionContext(
                subExecution.getId(),
                subflowGraph,
                subflowInputs
        );
        subContext.setFlowId(subflowDefinition.getId());

        Map<String, Object> resultOutput = new HashMap<>();
        resultOutput.put("index", index);
        resultOutput.put("item", item);

        try {
            getFlowEngine().execute(subContext);

            FlowExecution completedExecution = flowExecutionMapper.selectById(subExecution.getId());
            if (completedExecution == null) {
                return IterationResult.failure(resultOutput, "子流程执行记录不存在");
            }

            String status = completedExecution.getStatus();
            if (ExecutionStatus.COMPLETED.getValue().equals(status)) {
                Map<String, Object> subflowOutputs = extractSubflowOutputs(
                        completedExecution, subContext, subflowGraph
                );
                resultOutput.put("success", true);
                resultOutput.put("executionId", completedExecution.getId());
                resultOutput.put("output", subflowOutputs);
                return IterationResult.success(resultOutput);
            }

            if (ExecutionStatus.FAILED.getValue().equals(status)) {
                String errorMsg = completedExecution.getErrorMessage();
                resultOutput.put("success", false);
                resultOutput.put("error", errorMsg);
                return IterationResult.failure(resultOutput, errorMsg);
            }

            if (ExecutionStatus.PAUSED.getValue().equals(status)) {
                String errorMsg = "子流程进入等待状态，ForEach 暂不支持等待流程";
                resultOutput.put("success", false);
                resultOutput.put("error", errorMsg);
                return IterationResult.failure(resultOutput, errorMsg);
            }

            String errorMsg = "子流程处于未知状态: " + status;
            resultOutput.put("success", false);
            resultOutput.put("error", errorMsg);
            return IterationResult.failure(resultOutput, errorMsg);
        } catch (Exception e) {
            log.error("子流程执行异常: subExecutionId={}", subExecution.getId(), e);
            subExecution.setStatus(ExecutionStatus.FAILED.getValue());
            subExecution.setErrorMessage(e.getMessage());
            subExecution.setCompletedAt(LocalDateTime.now());
            flowExecutionMapper.updateById(subExecution);

            resultOutput.put("success", false);
            resultOutput.put("error", e.getMessage());
            return IterationResult.failure(resultOutput, e.getMessage());
        }
    }

    private Map<String, Object> buildSummary(String mode,
                                             int total,
                                             int successCount,
                                             int failedCount,
                                             List<Map<String, Object>> results) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("mode", mode);
        summary.put("total", total);
        summary.put("successCount", successCount);
        summary.put("failedCount", failedCount);
        summary.put("results", results);
        return summary;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildSubflowInputs(Map<String, Object> config,
                                                   ExecutionContext context,
                                                   FlowGraphDTO subflowGraph,
                                                   Object item,
                                                   int index,
                                                   String itemVariable,
                                                   String indexVariable,
                                                   StandardEvaluationContext evalContext) {
        Map<String, Object> inputs = new HashMap<>();

        if (itemVariable != null && !itemVariable.isEmpty()) {
            inputs.put(itemVariable, item);
        }
        if (indexVariable != null && !indexVariable.isEmpty()) {
            inputs.put(indexVariable, index);
        }

        Object inputMappingsObj = config.get("inputMappings");
        if (inputMappingsObj == null) {
            applyDefaultInputs(inputs, subflowGraph);
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
            applyDefaultInputs(inputs, subflowGraph);
            return inputs;
        }

        for (Map<String, String> mapping : inputMappings) {
            String targetVariable = mapping.get("targetVariable");
            if (targetVariable == null) {
                targetVariable = mapping.get("targetParam");
            }
            String sourceExpression = mapping.get("sourceExpression");

            if (targetVariable == null || targetVariable.isEmpty()) {
                continue;
            }

            if (sourceExpression == null || sourceExpression.isEmpty()) {
                continue;
            }

            try {
                Object value = resolveExpression(sourceExpression, context, evalContext, itemVariable, indexVariable);
                inputs.put(targetVariable, value);
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

    private FlowExecution createSubflowExecution(String subflowId,
                                                 String parentExecutionId,
                                                 String parentNodeId,
                                                 Map<String, Object> inputs,
                                                 FlowDefinition subflowDefinition) {
        FlowExecution execution = new FlowExecution();
        execution.setId(UUID.randomUUID().toString());
        execution.setProjectId(subflowDefinition.getProjectId());
        execution.setFlowId(subflowId);
        execution.setFlowVersion(subflowDefinition.getVersion());
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
        return execution;
    }

    private Map<String, Object> extractSubflowOutputs(FlowExecution execution,
                                                      ExecutionContext subContext,
                                                      FlowGraphDTO subflowGraph) {
        Map<String, Object> outputs = new HashMap<>();
        outputs.put("_executionId", execution.getId());
        outputs.put("_status", execution.getStatus());

        FlowGraphDTO.NodeDTO endNode = findExecutedEndNode(subflowGraph, subContext);
        if (endNode != null && endNode.getData().getConfig() != null) {
            Map<String, Object> endConfig = endNode.getData().getConfig();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> outputVariables =
                    (List<Map<String, Object>>) endConfig.get("outputVariables");
            if (outputVariables != null && !outputVariables.isEmpty()) {
                for (Map<String, Object> varDef : outputVariables) {
                    String varName = (String) varDef.get("name");
                    String sourceExpression = (String) varDef.get("expression");

                    if (varName != null && !varName.isEmpty()) {
                        Object value = null;
                        if (sourceExpression != null && !sourceExpression.isEmpty()) {
                            value = resolveExpressionFromSubContext(sourceExpression, subContext);
                        }
                        outputs.put(varName, value);
                    }
                }
            }
        }

        String outputsJson = execution.getOutputData();
        if (outputsJson != null && !outputsJson.isEmpty()) {
            try {
                Map<String, Object> savedData = objectMapper.readValue(
                        outputsJson,
                        new TypeReference<Map<String, Object>>() {}
                );
                if (savedData.containsKey("outputs") && savedData.get("outputs") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> nestedOutputs = (Map<String, Object>) savedData.get("outputs");
                    for (Map.Entry<String, Object> entry : nestedOutputs.entrySet()) {
                        String key = entry.getKey();
                        if (!outputs.containsKey(key) && !key.startsWith("_")) {
                            outputs.put(key, entry.getValue());
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("解析子流程输出数据失败: {}", e.getMessage());
            }
        }

        return outputs;
    }

    private FlowGraphDTO.NodeDTO findExecutedEndNode(FlowGraphDTO graph, ExecutionContext context) {
        if (graph == null || graph.getNodes() == null) {
            return null;
        }

        if (context != null && context.getCurrentNodeId() != null) {
            String currentNodeId = context.getCurrentNodeId();
            for (FlowGraphDTO.NodeDTO node : graph.getNodes()) {
                if (node.getData() != null &&
                        NodeType.END.getValue().equals(node.getData().getNodeType()) &&
                        currentNodeId.equals(node.getId())) {
                    return node;
                }
            }
        }

        for (FlowGraphDTO.NodeDTO node : graph.getNodes()) {
            if (node.getData() != null && NodeType.END.getValue().equals(node.getData().getNodeType())) {
                return node;
            }
        }
        return null;
    }

    private Object resolveExpressionFromSubContext(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }
        return expressionResolver.resolve(expression, context);
    }

    private Object resolveExpression(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }
        return expressionResolver.resolve(expression, context);
    }

    private Object resolveExpression(String expression,
                                     ExecutionContext context,
                                     StandardEvaluationContext evalContext,
                                     String itemVariable,
                                     String indexVariable) {
        if (expression == null || expression.isEmpty()) {
            return null;
        }

        String path = expressionResolver.unwrapExpression(expression);
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.", 2);
        String root = parts[0];
        if (root.equals(itemVariable) || root.equals(indexVariable)) {
            try {
                String spelExpression = expressionResolver.convertToSpelExpression(path);
                return SPEL_PARSER.parseExpression(spelExpression).getValue(evalContext);
            } catch (Exception e) {
                log.debug("迭代表达式解析失败: {}", e.getMessage());
                return null;
            }
        }

        return expressionResolver.resolve(expression, evalContext, context);
    }

    private List<Object> normalizeItems(Object itemsValue) {
        if (itemsValue == null) {
            return Collections.emptyList();
        }

        if (itemsValue instanceof Collection) {
            return new ArrayList<>((Collection<?>) itemsValue);
        }

        if (itemsValue.getClass().isArray()) {
            int length = Array.getLength(itemsValue);
            List<Object> items = new ArrayList<>(length);
            for (int i = 0; i < length; i++) {
                items.add(Array.get(itemsValue, i));
            }
            return items;
        }

        if (itemsValue instanceof String) {
            String raw = ((String) itemsValue).trim();
            if (raw.isEmpty()) {
                return Collections.emptyList();
            }
            try {
                Object parsed = objectMapper.readValue(raw, Object.class);
                return normalizeItems(parsed);
            } catch (Exception e) {
                log.warn("解析迭代数据字符串失败: {}", e.getMessage());
                return null;
            }
        }

        return null;
    }

    private String normalizeMode(String mode) {
        if (mode == null) {
            return "serial";
        }
        String normalized = mode.trim().toLowerCase();
        if ("parallel".equals(normalized) || "parallelstream".equals(normalized)) {
            return "parallel";
        }
        return "serial";
    }

    private String normalizeVariableName(String value, String defaultValue) {
        if (value == null || value.trim().isEmpty()) {
            return defaultValue;
        }
        return value.trim();
    }

    private String getString(Object value) {
        if (value == null) {
            return null;
        }
        return String.valueOf(value).trim();
    }

    private static class IterationResult {
        private final boolean success;
        private final Map<String, Object> output;
        private final String errorMessage;

        private IterationResult(boolean success, Map<String, Object> output, String errorMessage) {
            this.success = success;
            this.output = output;
            this.errorMessage = errorMessage;
        }

        public static IterationResult success(Map<String, Object> output) {
            return new IterationResult(true, output, null);
        }

        public static IterationResult failure(Map<String, Object> output, String errorMessage) {
            return new IterationResult(false, output, errorMessage);
        }
    }
}
