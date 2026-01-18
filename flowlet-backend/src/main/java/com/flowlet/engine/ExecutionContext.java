package com.flowlet.engine;

import com.flowlet.dto.FlowGraphDTO;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 流程执行上下文
 * 贯穿整个工作流执行周期，支持同步/异步节点的属性保存和读取
 */
@Data
@Slf4j
public class ExecutionContext implements Serializable {

    private static final long serialVersionUID = 1L;

    private String executionId;
    private String flowId;
    private transient FlowGraphDTO flowGraph;
    private String currentNodeId;
    private boolean paused = false;

    /**
     * 调用链 - 记录子流程调用路径，用于循环检测
     */
    private List<String> callChain = new ArrayList<>();

    /**
     * 输入数据 - 流程启动时的输入参数
     */
    private Map<String, Object> inputs = new ConcurrentHashMap<>();

    // ==================== 构造函数 ====================
    
    public ExecutionContext() {
    }
    
    /**
     * 带参数构造函数 - 用于子流程执行
     * 注意：ConcurrentHashMap 不允许 null 值，需要过滤
     */
    public ExecutionContext(String executionId, FlowGraphDTO flowGraph, Map<String, Object> inputs) {
        this.executionId = executionId;
        this.flowGraph = flowGraph;
        if (inputs != null) {
            // ConcurrentHashMap 不允许 null 值，需要过滤掉
            this.inputs = new ConcurrentHashMap<>();
            inputs.forEach((key, value) -> {
                if (key != null && value != null) {
                    this.inputs.put(key, value);
                }
            });
        }
    }

    /**
     * 全局变量 - 贯穿整个流程，可被任意节点读写
     */
    private Map<String, Object> variables = new ConcurrentHashMap<>();

    /**
     * 常量 - 项目级与流程级常量
     */
    private Map<String, Object> constants = new ConcurrentHashMap<>();

    /**
     * 节点输出 - 以节点ID为key存储每个节点的输出
     */
    private Map<String, Object> nodeOutputs = new ConcurrentHashMap<>();

    /**
     * 已完成的节点ID集合 - 用于汇聚节点判断前置节点是否都已完成
     */
    private Set<String> completedNodeIds = ConcurrentHashMap.newKeySet();

    /**
     * 节点等待状态 - 记录每个汇聚节点需要等待的前置节点以及已到达的前置节点
     * key: 汇聚节点ID, value: 已到达的前置节点ID集合
     */
    private Map<String, Set<String>> nodeArrivedPredecessors = new ConcurrentHashMap<>();

    /**
     * 实际执行的边ID集合 - 用于判断条件分支实际走了哪条路径
     */
    private Set<String> executedEdgeIds = ConcurrentHashMap.newKeySet();

    // ==================== 变量操作 ====================

    /**
     * 设置运行时变量
     * 注意：只能修改 variables，不能修改 inputs（输入参数是只读的）
     */
    public void setVariable(String key, Object value) {
        variables.put(key, value);
    }

    /**
     * 获取运行时变量
     * 注意：只从 variables 中获取，不会查找 inputs
     * 如需访问输入参数，请使用 getInput() 或 resolveVariable("input.xxx")
     */
    public Object getVariable(String key) {
        return variables.get(key);
    }

    /**
     * 获取运行时变量，如果不存在则返回默认值
     */
    @SuppressWarnings("unchecked")
    public <T> T getVariable(String key, T defaultValue) {
        Object value = variables.get(key);
        return value != null ? (T) value : defaultValue;
    }

    /**
     * 检查变量是否存在
     */
    public boolean hasVariable(String key) {
        return variables.containsKey(key);
    }

    /**
     * 删除变量
     */
    public void removeVariable(String key) {
        variables.remove(key);
    }

    /**
     * 获取所有运行时变量（不包括输入参数）
     */
    public Map<String, Object> getAllVariables() {
        return new HashMap<>(variables);
    }

    /**
     * 获取常量
     */
    public Object getConstant(String key) {
        return constants.get(key);
    }

    /**
     * 获取全部常量
     */
    public Map<String, Object> getAllConstants() {
        return new HashMap<>(constants);
    }

    /**
     * 批量设置常量
     */
    public void setConstants(Map<String, Object> constants) {
        if (constants == null) {
            this.constants = new ConcurrentHashMap<>();
        } else {
            this.constants = new ConcurrentHashMap<>(constants);
        }
    }

    // ==================== 输入参数操作 ====================

    /**
     * 获取输入参数（只读）
     */
    public Object getInput(String key) {
        return inputs.get(key);
    }

    /**
     * 检查输入参数是否存在
     */
    public boolean hasInput(String key) {
        return inputs.containsKey(key);
    }

    /**
     * 解析变量路径表达式
     * 支持格式:
     * - input.paramName - 流程输入参数
     * - nodes.nodeId.field - 节点输出
     * - var.varName 或 variable.varName - 全流程变量
     * - context.executionId/flowId/timestamp - 全局上下文
     * - varName - 直接变量名（兼容旧格式）
     */
    @SuppressWarnings("unchecked")
    public Object resolveVariable(String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.", 2);
        String root = parts[0];

        // input.xxx - 输入参数
        if ("input".equals(root) && parts.length > 1) {
            return inputs.get(parts[1]);
        }

        // nodes.nodeId.field - 节点输出
        if ("nodes".equals(root) && parts.length > 1) {
            String[] nodeParts = parts[1].split("\\.", 2);
            String nodeId = nodeParts[0];
            Object nodeOutput = nodeOutputs.get(nodeId);
            
            if (nodeParts.length > 1 && nodeOutput instanceof Map) {
                return ((Map<String, Object>) nodeOutput).get(nodeParts[1]);
            }
            return nodeOutput;
        }

        // var.xxx 或 variable.xxx - 全流程变量
        if (("var".equals(root) || "variable".equals(root)) && parts.length > 1) {
            return variables.get(parts[1]);
        }

        // const.xxx / constant.xxx / constants.xxx - 常量
        if (("const".equals(root) || "constant".equals(root) || "constants".equals(root)) && parts.length > 1) {
            return constants.get(parts[1]);
        }

        // context.xxx - 全局上下文
        if ("context".equals(root) && parts.length > 1) {
            switch (parts[1]) {
                case "executionId":
                    return executionId;
                case "flowId":
                    return flowId;
                case "timestamp":
                    return System.currentTimeMillis();
                default:
                    log.debug("未知的 context 属性: {}", parts[1]);
                    return null;
            }
        }

        // 直接变量名
        Object value = variables.get(path);
        if (value != null) {
            return value;
        }
        
        return inputs.get(path);
    }

    // ==================== 节点输出操作 ====================

    public void saveNodeOutput(String nodeId, Object output) {
        if (output != null) {
            nodeOutputs.put(nodeId, output);
        }
    }

    public Object getNodeOutput(String nodeId) {
        return nodeOutputs.get(nodeId);
    }

    @SuppressWarnings("unchecked")
    public Object getNodeOutputField(String nodeId, String fieldKey) {
        Object output = nodeOutputs.get(nodeId);
        if (output instanceof Map) {
            return ((Map<String, Object>) output).get(fieldKey);
        }
        return null;
    }

    // ==================== 节点完成状态操作 ====================

    /**
     * 标记节点已完成
     */
    public void markNodeCompleted(String nodeId) {
        completedNodeIds.add(nodeId);
        log.debug("节点已完成: nodeId={}, 已完成节点数: {}", nodeId, completedNodeIds.size());
    }

    /**
     * 检查节点是否已完成
     */
    public boolean isNodeCompleted(String nodeId) {
        return completedNodeIds.contains(nodeId);
    }

    // ==================== 汇聚节点等待操作 ====================

    /**
     * 记录前置节点已到达汇聚节点
     * @param targetNodeId 汇聚节点ID
     * @param predecessorNodeId 已到达的前置节点ID
     */
    public void markPredecessorArrived(String targetNodeId, String predecessorNodeId) {
        nodeArrivedPredecessors.computeIfAbsent(targetNodeId, k -> ConcurrentHashMap.newKeySet())
                .add(predecessorNodeId);
        log.debug("前置节点已到达: targetNode={}, predecessor={}, arrivedCount={}", 
                targetNodeId, predecessorNodeId, 
                nodeArrivedPredecessors.get(targetNodeId).size());
    }

    /**
     * 获取已到达的前置节点集合
     */
    public Set<String> getArrivedPredecessors(String targetNodeId) {
        return nodeArrivedPredecessors.getOrDefault(targetNodeId, new HashSet<>());
    }

    /**
     * 清除汇聚节点的等待状态（节点开始执行后清理）
     */
    public void clearArrivedPredecessors(String targetNodeId) {
        nodeArrivedPredecessors.remove(targetNodeId);
    }

    // ==================== 执行路径记录 ====================

    /**
     * 记录已执行的边
     */
    public void markEdgeExecuted(String edgeId) {
        executedEdgeIds.add(edgeId);
    }

    /**
     * 检查边是否已执行
     */
    public boolean isEdgeExecuted(String edgeId) {
        return executedEdgeIds.contains(edgeId);
    }

    // ==================== 数据聚合 ====================

    /**
     * 合并所有数据用于模板解析
     * 支持以下变量格式：
     * - {{input.变量名}} - 用户输入变量
     * - {{context.executionId/flowId/timestamp}} - 上下文变量
     * - {{nodes.节点ID.属性名}} - 节点输出变量
     * - {{var.变量名}} 或 {{variable.变量名}} - 全流程变量
     * - {{const.变量名}} 或 {{constant.变量名}} - 常量
     */
    public Map<String, Object> getAllData() {
        Map<String, Object> allData = new HashMap<>();
        
        // input.xxx - 用户输入变量
        allData.put("input", new HashMap<>(inputs));
        allData.put("inputs", new HashMap<>(inputs)); // 同时支持复数形式
        
        // context.xxx - 上下文变量
        Map<String, Object> contextData = new HashMap<>();
        contextData.put("executionId", executionId);
        contextData.put("flowId", flowId);
        contextData.put("timestamp", System.currentTimeMillis());
        contextData.put("currentNodeId", currentNodeId);
        allData.put("context", contextData);
        
        // nodes.nodeId.xxx - 节点输出变量
        allData.put("nodes", new HashMap<>(nodeOutputs));
        
        // var.xxx / variable.xxx - 全流程变量
        allData.put("var", new HashMap<>(variables));
        allData.put("variable", new HashMap<>(variables)); // 同时支持完整形式

        // const.xxx / constant.xxx / constants.xxx - 常量
        allData.put("const", new HashMap<>(constants));
        allData.put("constant", new HashMap<>(constants));
        allData.put("constants", new HashMap<>(constants));
        
        // 保留旧格式兼容（直接访问输入变量和全流程变量）
        allData.putAll(inputs);
        allData.putAll(variables);
        allData.put("_executionId", executionId);
        allData.put("_flowId", flowId);
        allData.put("_currentNodeId", currentNodeId);
        
        return allData;
    }

    // ==================== 序列化 ====================

    public Map<String, Object> toSerializable() {
        Map<String, Object> data = new HashMap<>();
        data.put("variables", new HashMap<>(variables));
        data.put("constants", new HashMap<>(constants));
        data.put("nodeOutputs", new HashMap<>(nodeOutputs));
        data.put("completedNodeIds", new HashSet<>(completedNodeIds));
        data.put("executedEdgeIds", new HashSet<>(executedEdgeIds));
        
        // 序列化 nodeArrivedPredecessors
        Map<String, Set<String>> arrivedMap = new HashMap<>();
        nodeArrivedPredecessors.forEach((k, v) -> arrivedMap.put(k, new HashSet<>(v)));
        data.put("nodeArrivedPredecessors", arrivedMap);
        
        return data;
    }

    @SuppressWarnings("unchecked")
    public void fromSerializable(Map<String, Object> data) {
        if (data == null) return;
        
        if (data.get("variables") instanceof Map) {
            this.variables = new ConcurrentHashMap<>((Map<String, Object>) data.get("variables"));
        }
        if (data.get("constants") instanceof Map) {
            this.constants = new ConcurrentHashMap<>((Map<String, Object>) data.get("constants"));
        }
        if (data.get("nodeOutputs") instanceof Map) {
            this.nodeOutputs = new ConcurrentHashMap<>((Map<String, Object>) data.get("nodeOutputs"));
        }
        if (data.get("completedNodeIds") instanceof Set) {
            this.completedNodeIds = ConcurrentHashMap.newKeySet();
            this.completedNodeIds.addAll((Set<String>) data.get("completedNodeIds"));
        }
        if (data.get("executedEdgeIds") instanceof Set) {
            this.executedEdgeIds = ConcurrentHashMap.newKeySet();
            this.executedEdgeIds.addAll((Set<String>) data.get("executedEdgeIds"));
        }
        if (data.get("nodeArrivedPredecessors") instanceof Map) {
            this.nodeArrivedPredecessors = new ConcurrentHashMap<>();
            Map<String, Set<String>> arrivedMap = (Map<String, Set<String>>) data.get("nodeArrivedPredecessors");
            arrivedMap.forEach((k, v) -> {
                Set<String> set = ConcurrentHashMap.newKeySet();
                set.addAll(v);
                this.nodeArrivedPredecessors.put(k, set);
            });
        }
    }
}
