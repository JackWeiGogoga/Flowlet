package com.flowlet.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.handler.NodeHandler;
import com.flowlet.entity.*;
import com.flowlet.enums.ExecutionStatus;
import com.flowlet.enums.NodeExecutionStatus;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * 流程执行引擎
 * 支持：
 * 1. 一个节点输出到多个节点 - 并行执行
 * 2. 多个节点输入到一个节点 - 等待所有前置节点完成
 * 3. 条件分支 - 只执行匹配的分支路径，汇聚时不需要等待未执行的分支
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FlowEngine {

    private final List<NodeHandler> nodeHandlers;
    private final FlowExecutionMapper flowExecutionMapper;
    private final NodeExecutionMapper nodeExecutionMapper;
    private final AsyncCallbackMapper asyncCallbackMapper;
    private final ObjectMapper objectMapper;
    private final ExecutionConditionEvaluator executionConditionEvaluator;

    private Map<String, NodeHandler> handlerMap;
    
    /**
     * 并行执行线程池
     */
    private final Executor parallelExecutor = Executors.newCachedThreadPool();

    /**
     * 获取节点处理器
     */
    private NodeHandler getHandler(String nodeType) {
        if (handlerMap == null) {
            handlerMap = nodeHandlers.stream()
                    .collect(Collectors.toMap(NodeHandler::getNodeType, h -> h));
        }
        return handlerMap.get(nodeType);
    }

    /**
     * 执行流程
     * 注意：不使用 @Transactional，因为并行执行时每个线程需要独立的数据库连接
     */
    public void execute(ExecutionContext context) {
        log.info("开始执行流程: executionId={}", context.getExecutionId());

        FlowGraphDTO graph = context.getFlowGraph();
        if (graph == null || graph.getNodes() == null || graph.getNodes().isEmpty()) {
            throw new RuntimeException("流程图数据为空");
        }

        // 找到开始节点
        FlowGraphDTO.NodeDTO startNode = findStartNode(graph);
        if (startNode == null) {
            throw new RuntimeException("未找到开始节点");
        }

        // 更新执行状态为运行中
        updateExecutionStatus(context.getExecutionId(), ExecutionStatus.RUNNING, null);

        // 从开始节点开始执行
        executeNode(startNode, context, null);
    }

    /**
     * 继续执行流程 (从指定节点继续)
     * 注意：不使用 @Transactional，因为并行执行时每个线程需要独立的数据库连接
     */
    public void resumeExecution(ExecutionContext context, String fromNodeId, Map<String, Object> callbackData) {
        log.info("恢复执行流程: executionId={}, fromNodeId={}", context.getExecutionId(), fromNodeId);

        // 将回调数据保存到上下文
        if (callbackData != null) {
            context.saveNodeOutput(fromNodeId, callbackData);
        }

        // 更新执行状态为运行中
        updateExecutionStatus(context.getExecutionId(), ExecutionStatus.RUNNING, null);

        // 标记节点已完成
        context.markNodeCompleted(fromNodeId);

        // 找到下一个节点继续执行
        List<NextNodeInfo> nextNodeInfos = findNextNodes(context.getFlowGraph(), fromNodeId, context);
        executeNextNodes(nextNodeInfos, fromNodeId, context);
    }

    /**
     * 获取节点的实际类型
     */
    private String getNodeType(FlowGraphDTO.NodeDTO node) {
        if (node.getData() != null && node.getData().getNodeType() != null) {
            return node.getData().getNodeType();
        }
        return node.getType();
    }

    /**
     * 获取节点的显示名称
     */
    private String getNodeLabel(FlowGraphDTO.NodeDTO node) {
        if (node.getData() != null && node.getData().getLabel() != null) {
            return node.getData().getLabel();
        }
        return node.getId();
    }

    /**
     * 执行单个节点
     * @param node 要执行的节点
     * @param context 执行上下文
     * @param fromNodeId 来源节点ID（用于汇聚判断）
     */
    private void executeNode(FlowGraphDTO.NodeDTO node, ExecutionContext context, String fromNodeId) {
        String nodeType = getNodeType(node);
        log.info("准备执行节点: nodeId={}, type={}, fromNode={}", node.getId(), nodeType, fromNodeId);

        // 检查汇聚节点是否需要等待
        if (fromNodeId != null && shouldWaitForPredecessors(node, fromNodeId, context)) {
            log.info("节点等待其他前置节点: nodeId={}", node.getId());
            return; // 暂不执行，等待其他分支到达
        }

        context.setCurrentNodeId(node.getId());
        
        // 清除汇聚等待状态
        context.clearArrivedPredecessors(node.getId());

        // 检查执行条件（开始节点和结束节点不检查）
        if (!NodeType.START.getValue().equals(nodeType) && !NodeType.END.getValue().equals(nodeType)) {
            if (!executionConditionEvaluator.evaluate(node, context)) {
                log.info("节点执行条件不满足，跳过执行: nodeId={}", node.getId());
                handleNodeSkipped(node, context);
                return;
            }
        }

        // 创建节点执行记录
        NodeExecution nodeExecution = createNodeExecution(context.getExecutionId(), node);

        try {
            // 获取节点处理器
            NodeHandler handler = getHandler(nodeType);
            if (handler == null) {
                throw new RuntimeException("未找到节点处理器: " + nodeType);
            }

            // 更新节点状态为运行中
            updateNodeExecutionStatus(nodeExecution.getId(), NodeExecutionStatus.RUNNING, null, null);

            // 执行节点
            NodeHandler.NodeResult result = handler.execute(node, context);

            if (result.isSuccess()) {
                if (result.isNeedPause()) {
                    // 需要等待异步回调
                    handleAsyncPause(context, node, nodeExecution, result);
                } else {
                    // 节点执行成功
                    handleNodeSuccess(context, node, nodeExecution, result);
                }
            } else {
                // 节点执行失败
                handleNodeFailure(context, nodeExecution, result.getErrorMessage());
            }

        } catch (Exception e) {
            log.error("节点执行异常: nodeId={}, error={}", node.getId(), e.getMessage(), e);
            handleNodeFailure(context, nodeExecution, e.getMessage());
        }
    }

    /**
     * 检查是否需要等待其他前置节点
     * @param node 当前要执行的节点
     * @param fromNodeId 当前到达的前置节点ID
     * @param context 执行上下文
     * @return true表示需要等待，false表示可以执行
     */
    private boolean shouldWaitForPredecessors(FlowGraphDTO.NodeDTO node, String fromNodeId, ExecutionContext context) {
        FlowGraphDTO graph = context.getFlowGraph();
        
        // 获取所有指向当前节点的入边
        List<FlowGraphDTO.EdgeDTO> incomingEdges = getIncomingEdges(graph, node.getId());
        
        if (incomingEdges.size() <= 1) {
            // 只有一个或没有入边，不需要等待
            return false;
        }
        
        // 计算需要等待的入边（排除条件分支中未执行的路径）
        Set<String> requiredPredecessors = calculateRequiredPredecessors(node.getId(), incomingEdges, context);
        
        if (requiredPredecessors.size() <= 1) {
            // 实际只有一个需要等待的入边
            return false;
        }
        
        // 记录当前前置节点已到达
        context.markPredecessorArrived(node.getId(), fromNodeId);
        
        // 检查是否所有需要的前置节点都已到达
        Set<String> arrivedPredecessors = context.getArrivedPredecessors(node.getId());
        
        log.info("汇聚节点等待状态: nodeId={}, required={}, arrived={}", 
                node.getId(), requiredPredecessors, arrivedPredecessors);
        
        // 如果所有需要的前置节点都已到达，则不需要等待
        return !arrivedPredecessors.containsAll(requiredPredecessors);
    }

    /**
     * 计算需要等待的前置节点
     * 排除条件分支中未执行的路径（支持递归向上追溯）
     */
    private Set<String> calculateRequiredPredecessors(String nodeId, List<FlowGraphDTO.EdgeDTO> incomingEdges, 
                                                       ExecutionContext context) {
        Set<String> requiredPredecessors = new HashSet<>();
        FlowGraphDTO graph = context.getFlowGraph();
        
        for (FlowGraphDTO.EdgeDTO edge : incomingEdges) {
            String sourceNodeId = edge.getSource();
            FlowGraphDTO.NodeDTO sourceNode = findNodeById(graph, sourceNodeId);
            
            if (sourceNode == null) {
                continue;
            }
            
            // 检查来源节点是否是条件节点
            if (NodeType.CONDITION.getValue().equals(getNodeType(sourceNode))) {
                // 如果是条件节点的出边，检查该边是否被执行
                if (isConditionBranchExecuted(sourceNodeId, edge, context)) {
                    requiredPredecessors.add(sourceNodeId);
                }
                // 未执行的条件分支不需要等待
            } else {
                // 非条件节点，需要向上追溯检查是否在未执行的条件分支路径上
                if (isNodeReachable(sourceNodeId, context, new HashSet<>())) {
                    requiredPredecessors.add(sourceNodeId);
                } else {
                    log.info("前置节点在未执行的条件分支上，不需要等待: nodeId={}, predecessorId={}", 
                            nodeId, sourceNodeId);
                }
            }
        }
        
        return requiredPredecessors;
    }

    /**
     * 检查节点是否可达（即不在未执行的条件分支路径上）
     * 向上递归追溯，检查路径是否被未执行的条件分支阻断
     */
    private boolean isNodeReachable(String nodeId, ExecutionContext context, Set<String> visited) {
        // 避免循环
        if (visited.contains(nodeId)) {
            return false;
        }
        visited.add(nodeId);
        
        FlowGraphDTO graph = context.getFlowGraph();
        FlowGraphDTO.NodeDTO node = findNodeById(graph, nodeId);
        
        if (node == null) {
            return false;
        }
        
        // 如果节点已经执行完成，说明可达
        if (context.isNodeCompleted(nodeId)) {
            return true;
        }
        
        // 获取该节点的所有入边
        List<FlowGraphDTO.EdgeDTO> incomingEdges = getIncomingEdges(graph, nodeId);
        
        // 如果没有入边（开始节点），说明可达
        if (incomingEdges.isEmpty()) {
            return true;
        }
        
        // 检查每条入边的来源
        for (FlowGraphDTO.EdgeDTO edge : incomingEdges) {
            String sourceNodeId = edge.getSource();
            FlowGraphDTO.NodeDTO sourceNode = findNodeById(graph, sourceNodeId);
            
            if (sourceNode == null) {
                continue;
            }
            
            // 如果来源是条件节点
            if (NodeType.CONDITION.getValue().equals(getNodeType(sourceNode))) {
                // 检查这条边对应的分支是否被执行
                if (isConditionBranchExecuted(sourceNodeId, edge, context)) {
                    // 这条分支被执行了，继续向上检查条件节点是否可达
                    if (isNodeReachable(sourceNodeId, context, visited)) {
                        return true;
                    }
                }
                // 如果这条分支没被执行，继续检查其他入边
            } else {
                // 非条件节点，继续向上追溯
                if (isNodeReachable(sourceNodeId, context, visited)) {
                    return true;
                }
            }
        }
        
        // 所有入边都不可达
        return false;
    }

    /**
     * 检查条件分支是否被执行
     * 支持 IF/ELIF/ELSE 多分支条件判断
     */
    private boolean isConditionBranchExecuted(String conditionNodeId, FlowGraphDTO.EdgeDTO edge, ExecutionContext context) {
        // 如果条件节点还没执行完成，说明这个分支还没开始
        if (!context.isNodeCompleted(conditionNodeId)) {
            return false;
        }
        
        // 检查边是否被标记为已执行
        if (edge.getId() != null && context.isEdgeExecuted(edge.getId())) {
            return true;
        }
        
        // 通过条件节点的输出结果判断
        Object nodeOutput = context.getNodeOutput(conditionNodeId);
        if (nodeOutput instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> outputMap = (Map<String, Object>) nodeOutput;
            
            // 优先使用新的 matchedHandleId 字段（支持 IF/ELIF/ELSE）
            String matchedHandleId = (String) outputMap.get("matchedHandleId");
            if (matchedHandleId != null) {
                String edgeHandle = edge.getSourceHandle();
                return matchedHandleId.equals(edgeHandle);
            }
            
            // 兼容旧格式：使用 result 字段（布尔值）
            Boolean result = (Boolean) outputMap.get("result");
            if (result != null) {
                String expectedHandle = result ? "true" : "false";
                String edgeHandle = edge.getSourceHandle();
                return expectedHandle.equals(edgeHandle);
            }
        }
        
        return false;
    }

    /**
     * 获取指向某节点的所有入边
     */
    private List<FlowGraphDTO.EdgeDTO> getIncomingEdges(FlowGraphDTO graph, String nodeId) {
        if (graph.getEdges() == null) {
            return Collections.emptyList();
        }
        return graph.getEdges().stream()
                .filter(e -> nodeId.equals(e.getTarget()))
                .collect(Collectors.toList());
    }

    /**
     * 处理异步暂停
     */
    private void handleAsyncPause(ExecutionContext context, FlowGraphDTO.NodeDTO node,
                                   NodeExecution nodeExecution, NodeHandler.NodeResult result) {
        log.info("节点等待回调: nodeId={}, callbackKey={}", node.getId(), result.getCallbackKey());

        // 序列化执行过程数据
        String executionDataJson = null;
        if (result.getExecutionData() != null) {
            try {
                executionDataJson = objectMapper.writeValueAsString(result.getExecutionData());
            } catch (JsonProcessingException e) {
                log.warn("序列化执行过程数据失败: {}", e.getMessage());
            }
        }

        // 更新节点状态（包含执行过程数据）
        updateNodeExecutionStatus(nodeExecution.getId(), NodeExecutionStatus.WAITING_CALLBACK, null, null, executionDataJson);

        // 创建回调记录
        AsyncCallback callback = new AsyncCallback();
        callback.setExecutionId(context.getExecutionId());
        callback.setNodeExecutionId(nodeExecution.getId());
        callback.setCallbackKey(result.getCallbackKey());
        callback.setStatus("waiting");
        callback.setExpiredAt(LocalDateTime.now().plusHours(24)); // 24小时过期
        callback.setCreatedAt(LocalDateTime.now());

        // 从节点配置获取topic
        if (node.getData() != null && node.getData().getConfig() != null) {
            Map<String, Object> config = node.getData().getConfig();
            if (config.containsKey("topic")) {
                callback.setKafkaTopic((String) config.get("topic"));
            }
        }

        asyncCallbackMapper.insert(callback);

        // 更新流程执行状态为暂停
        updateExecutionStatus(context.getExecutionId(), ExecutionStatus.PAUSED, node.getId());
        saveContext(context);

        context.setPaused(true);
    }

    /**
     * 处理节点执行成功
     */
    private void handleNodeSuccess(ExecutionContext context, FlowGraphDTO.NodeDTO node,
                                    NodeExecution nodeExecution, NodeHandler.NodeResult result) {
        log.info("节点执行成功: nodeId={}", node.getId());

        // 保存节点输出
        context.saveNodeOutput(node.getId(), result.getOutput());
        
        // 处理输出别名 - 将节点输出写入全局变量
        handleOutputAlias(node, result.getOutput(), context);
        
        // 标记节点已完成
        context.markNodeCompleted(node.getId());

        // 更新节点状态
        String outputJson = null;
        if (result.getOutput() != null) {
            try {
                outputJson = objectMapper.writeValueAsString(result.getOutput());
            } catch (JsonProcessingException e) {
                log.warn("序列化节点输出失败: {}", e.getMessage());
            }
        }
        updateNodeExecutionStatus(nodeExecution.getId(), NodeExecutionStatus.COMPLETED, outputJson, null);

        // 判断是否为结束节点
        if (NodeType.END.getValue().equals(getNodeType(node))) {
            // 流程执行完成
            completeExecution(context, result.getOutput());
            return;
        }

        // 找到下一个节点继续执行
        List<NextNodeInfo> nextNodeInfos = findNextNodes(context.getFlowGraph(), node.getId(), context);
        executeNextNodes(nextNodeInfos, node.getId(), context);
    }

    /**
     * 执行下游节点（支持并行）
     * 注意：不检查 context.isPaused()，因为在并行执行时，一个分支暂停不应影响其他分支
     */
    private void executeNextNodes(List<NextNodeInfo> nextNodeInfos, String fromNodeId, ExecutionContext context) {
        if (nextNodeInfos.isEmpty()) {
            return;
        }

        if (nextNodeInfos.size() == 1) {
            // 单个下游节点，直接执行
            NextNodeInfo info = nextNodeInfos.get(0);
            if (info.edge != null && info.edge.getId() != null) {
                context.markEdgeExecuted(info.edge.getId());
            }
            executeNode(info.node, context, fromNodeId);
        } else {
            // 多个下游节点，并行执行
            log.info("并行执行多个下游节点: fromNode={}, count={}", fromNodeId, nextNodeInfos.size());
            
            // 标记所有边为已执行
            for (NextNodeInfo info : nextNodeInfos) {
                if (info.edge != null && info.edge.getId() != null) {
                    context.markEdgeExecuted(info.edge.getId());
                }
            }
            
            // 创建并行任务
            List<CompletableFuture<Void>> futures = nextNodeInfos.stream()
                    .map(info -> CompletableFuture.runAsync(() -> {
                        try {
                            executeNode(info.node, context, fromNodeId);
                        } catch (Exception e) {
                            log.error("并行节点执行失败: nodeId={}, error={}", info.node.getId(), e.getMessage(), e);
                        }
                    }, parallelExecutor))
                    .collect(Collectors.toList());

            // 等待所有并行任务完成
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        }
    }

    /**
     * 处理节点被跳过（执行条件不满足）
     */
    private void handleNodeSkipped(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("节点被跳过: nodeId={}", node.getId());

        // 创建节点执行记录
        NodeExecution nodeExecution = createNodeExecution(context.getExecutionId(), node);

        // 更新节点状态为跳过
        updateNodeExecutionStatus(nodeExecution.getId(), NodeExecutionStatus.SKIPPED, null, "执行条件不满足");

        // 标记节点已完成（虽然被跳过，但也算完成，让后续节点可以继续）
        context.markNodeCompleted(node.getId());

        // 找到下一个节点继续执行
        List<NextNodeInfo> nextNodeInfos = findNextNodes(context.getFlowGraph(), node.getId(), context);
        executeNextNodes(nextNodeInfos, node.getId(), context);
    }

    /**
     * 处理节点执行失败
     */
    private void handleNodeFailure(ExecutionContext context, NodeExecution nodeExecution, String errorMessage) {
        log.error("节点执行失败: nodeId={}, error={}", nodeExecution.getNodeId(), errorMessage);

        // 更新节点状态
        updateNodeExecutionStatus(nodeExecution.getId(), NodeExecutionStatus.FAILED, null, errorMessage);

        // 更新流程状态为失败
        FlowExecution execution = flowExecutionMapper.selectById(context.getExecutionId());
        if (execution != null) {
            execution.setStatus(ExecutionStatus.FAILED.getValue());
            execution.setErrorMessage(errorMessage);
            execution.setCurrentNodeId(nodeExecution.getNodeId());
            execution.setUpdatedAt(LocalDateTime.now());
            flowExecutionMapper.updateById(execution);
        }
    }

    /**
     * 完成流程执行
     */
    private void completeExecution(ExecutionContext context, Object output) {
        log.info("流程执行完成: executionId={}", context.getExecutionId());

        FlowExecution execution = flowExecutionMapper.selectById(context.getExecutionId());
        if (execution != null) {
            execution.setStatus(ExecutionStatus.COMPLETED.getValue());
            execution.setCompletedAt(LocalDateTime.now());
            execution.setUpdatedAt(LocalDateTime.now());

            if (output != null) {
                try {
                    execution.setOutputData(objectMapper.writeValueAsString(output));
                } catch (JsonProcessingException e) {
                    log.warn("序列化执行输出失败: {}", e.getMessage());
                }
            }

            flowExecutionMapper.updateById(execution);
        }
    }

    /**
     * 保存执行上下文
     */
    private void saveContext(ExecutionContext context) {
        FlowExecution execution = flowExecutionMapper.selectById(context.getExecutionId());
        if (execution != null) {
            try {
                execution.setContextData(objectMapper.writeValueAsString(context.toSerializable()));
                execution.setCurrentNodeId(context.getCurrentNodeId());
                execution.setUpdatedAt(LocalDateTime.now());
                flowExecutionMapper.updateById(execution);
            } catch (JsonProcessingException e) {
                log.warn("保存执行上下文失败: {}", e.getMessage());
            }
        }
    }

    /**
     * 查找开始节点
     */
    private FlowGraphDTO.NodeDTO findStartNode(FlowGraphDTO graph) {
        return graph.getNodes().stream()
                .filter(n -> NodeType.START.getValue().equals(getNodeType(n)))
                .findFirst()
                .orElse(null);
    }

    /**
     * 根据ID查找节点
     */
    private FlowGraphDTO.NodeDTO findNodeById(FlowGraphDTO graph, String nodeId) {
        return graph.getNodes().stream()
                .filter(n -> nodeId.equals(n.getId()))
                .findFirst()
                .orElse(null);
    }

    /**
     * 下一个节点信息（包含边和节点）
     */
    private static class NextNodeInfo {
        FlowGraphDTO.EdgeDTO edge;
        FlowGraphDTO.NodeDTO node;

        NextNodeInfo(FlowGraphDTO.EdgeDTO edge, FlowGraphDTO.NodeDTO node) {
            this.edge = edge;
            this.node = node;
        }
    }

    /**
     * 查找下一个节点（支持条件分支过滤）
     */
    private List<NextNodeInfo> findNextNodes(FlowGraphDTO graph, String currentNodeId, ExecutionContext context) {
        if (graph.getEdges() == null) {
            return Collections.emptyList();
        }

        FlowGraphDTO.NodeDTO currentNode = findNodeById(graph, currentNodeId);
        if (currentNode == null) {
            return Collections.emptyList();
        }

        // 找到从当前节点出发的所有边
        List<FlowGraphDTO.EdgeDTO> outgoingEdges = graph.getEdges().stream()
                .filter(e -> currentNodeId.equals(e.getSource()))
                .collect(Collectors.toList());

        // 如果是条件节点，根据执行结果过滤边
        if (NodeType.CONDITION.getValue().equals(getNodeType(currentNode))) {
            outgoingEdges = filterConditionBranchEdges(currentNodeId, outgoingEdges, context);
        }

        // 找到目标节点
        List<NextNodeInfo> result = new ArrayList<>();
        for (FlowGraphDTO.EdgeDTO edge : outgoingEdges) {
            FlowGraphDTO.NodeDTO targetNode = findNodeById(graph, edge.getTarget());
            if (targetNode != null) {
                result.add(new NextNodeInfo(edge, targetNode));
            }
        }

        return result;
    }

    /**
     * 根据条件节点的执行结果过滤分支边
     * 支持 IF/ELIF/ELSE 多分支条件判断
     */
    private List<FlowGraphDTO.EdgeDTO> filterConditionBranchEdges(String conditionNodeId, 
                                                                   List<FlowGraphDTO.EdgeDTO> edges,
                                                                   ExecutionContext context) {
        Object nodeOutput = context.getNodeOutput(conditionNodeId);
        if (!(nodeOutput instanceof Map)) {
            log.warn("条件节点输出格式不正确: nodeId={}", conditionNodeId);
            return edges; // 返回所有边作为兜底
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> outputMap = (Map<String, Object>) nodeOutput;
        
        // 优先使用新的 matchedHandleId 字段（支持 IF/ELIF/ELSE）
        String matchedHandleId = (String) outputMap.get("matchedHandleId");
        
        if (matchedHandleId != null) {
            log.debug("条件分支过滤(多分支): nodeId={}, matchedHandleId={}", 
                    conditionNodeId, matchedHandleId);
            
            return edges.stream()
                    .filter(e -> {
                        String sourceHandle = e.getSourceHandle();
                        if (matchedHandleId.equals(sourceHandle)) {
                            return true;
                        }
                        return "true".equals(matchedHandleId) &&
                                (sourceHandle == null || sourceHandle.isEmpty());
                    })
                    .collect(Collectors.toList());
        }
        
        // 兼容旧格式：使用 result 字段（布尔值）
        Boolean result = (Boolean) outputMap.get("result");
        
        if (result == null) {
            log.warn("条件节点没有返回结果: nodeId={}", conditionNodeId);
            return edges;
        }

        String expectedHandle = result ? "true" : "false";
        log.debug("条件分支过滤(旧格式): nodeId={}, result={}, expectedHandle={}", 
                conditionNodeId, result, expectedHandle);

        return edges.stream()
                .filter(e -> expectedHandle.equals(e.getSourceHandle()))
                .collect(Collectors.toList());
    }

    /**
     * 创建节点执行记录
     */
    private NodeExecution createNodeExecution(String executionId, FlowGraphDTO.NodeDTO node) {
        NodeExecution nodeExecution = new NodeExecution();
        nodeExecution.setExecutionId(executionId);
        nodeExecution.setNodeId(node.getId());
        nodeExecution.setNodeType(getNodeType(node));
        nodeExecution.setNodeName(getNodeLabel(node));
        nodeExecution.setStatus(NodeExecutionStatus.PENDING.getValue());
        nodeExecution.setRetryCount(0);
        nodeExecution.setStartedAt(LocalDateTime.now());
        nodeExecution.setCreatedAt(LocalDateTime.now());
        nodeExecution.setUpdatedAt(LocalDateTime.now());

        nodeExecutionMapper.insert(nodeExecution);
        return nodeExecution;
    }

    /**
     * 更新流程执行状态
     */
    private void updateExecutionStatus(String executionId, ExecutionStatus status, String currentNodeId) {
        FlowExecution execution = flowExecutionMapper.selectById(executionId);
        if (execution != null) {
            execution.setStatus(status.getValue());
            if (currentNodeId != null) {
                execution.setCurrentNodeId(currentNodeId);
            }
            if (status == ExecutionStatus.RUNNING && execution.getStartedAt() == null) {
                execution.setStartedAt(LocalDateTime.now());
            }
            execution.setUpdatedAt(LocalDateTime.now());
            flowExecutionMapper.updateById(execution);
        }
    }

    /**
     * 更新节点执行状态
     */
    private void updateNodeExecutionStatus(String nodeExecutionId, NodeExecutionStatus status,
                                            String outputData, String errorMessage) {
        updateNodeExecutionStatus(nodeExecutionId, status, outputData, errorMessage, null);
    }

    /**
     * 处理输出别名
     * 如果节点配置了 outputAlias，将节点输出写入全局变量
     * 支持多个分支节点使用相同的别名，实现变量统一引用
     */
    private void handleOutputAlias(FlowGraphDTO.NodeDTO node, Object output, ExecutionContext context) {
        if (node.getData() == null || node.getData().getConfig() == null) {
            return;
        }
        
        Map<String, Object> config = node.getData().getConfig();
        Object aliasObj = config.get("outputAlias");
        
        if (aliasObj == null) {
            return;
        }
        
        String alias = String.valueOf(aliasObj).trim();
        if (alias.isEmpty()) {
            return;
        }
        
        // 将输出写入全局变量
        context.setVariable(alias, output);
        log.info("节点输出别名设置成功: nodeId={}, alias={}", node.getId(), alias);
    }

    /**
     * 更新节点执行状态（包含执行过程数据）
     */
    private void updateNodeExecutionStatus(String nodeExecutionId, NodeExecutionStatus status,
                                            String outputData, String errorMessage, String executionData) {
        NodeExecution nodeExecution = nodeExecutionMapper.selectById(nodeExecutionId);
        if (nodeExecution != null) {
            nodeExecution.setStatus(status.getValue());
            if (outputData != null) {
                nodeExecution.setOutputData(outputData);
            }
            if (errorMessage != null) {
                nodeExecution.setErrorMessage(errorMessage);
            }
            if (executionData != null) {
                nodeExecution.setExecutionData(executionData);
            }
            if (status == NodeExecutionStatus.COMPLETED || status == NodeExecutionStatus.FAILED || status == NodeExecutionStatus.SKIPPED) {
                nodeExecution.setCompletedAt(LocalDateTime.now());
            }
            nodeExecution.setUpdatedAt(LocalDateTime.now());
            nodeExecutionMapper.updateById(nodeExecution);
        }
    }
}
