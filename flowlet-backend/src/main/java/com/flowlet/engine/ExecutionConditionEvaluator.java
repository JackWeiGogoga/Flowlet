package com.flowlet.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 执行条件评估器
 * 用于评估节点的执行条件，判断节点是否应该被跳过
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExecutionConditionEvaluator {

    private final ObjectMapper objectMapper;
    
    /**
     * 执行条件配置
     */
    public static class ExecutionConditionConfig {
        private boolean enabled;
        private String logicOperator; // and 或 or
        private List<ConditionItem> conditions;
        
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getLogicOperator() { return logicOperator; }
        public void setLogicOperator(String logicOperator) { this.logicOperator = logicOperator; }
        public List<ConditionItem> getConditions() { return conditions; }
        public void setConditions(List<ConditionItem> conditions) { this.conditions = conditions; }
    }

    /**
     * 单个条件项
     */
    public static class ConditionItem {
        private String id;
        private String variableKey;
        private String operator;
        private String value;
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getVariableKey() { return variableKey; }
        public void setVariableKey(String variableKey) { this.variableKey = variableKey; }
        public String getOperator() { return operator; }
        public void setOperator(String operator) { this.operator = operator; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }

    /**
     * 评估执行条件
     * @param node 节点定义
     * @param context 执行上下文
     * @return 如果应该执行返回 true，如果应该跳过返回 false
     */
    public boolean evaluate(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        if (node.getData() == null || node.getData().getConfig() == null) {
            return true; // 没有配置，默认执行
        }
        
        Map<String, Object> config = node.getData().getConfig();
        Object executionConditionObj = config.get("executionCondition");
        
        if (executionConditionObj == null) {
            return true; // 没有执行条件配置，默认执行
        }
        
        try {
            ExecutionConditionConfig conditionConfig;
            if (executionConditionObj instanceof Map) {
                conditionConfig = objectMapper.convertValue(executionConditionObj, ExecutionConditionConfig.class);
            } else {
                return true;
            }
            
            if (!conditionConfig.isEnabled()) {
                return true; // 未启用条件，默认执行
            }
            
            List<ConditionItem> conditions = conditionConfig.getConditions();
            if (conditions == null || conditions.isEmpty()) {
                return true; // 没有条件，默认执行
            }
            
            String logicOperator = conditionConfig.getLogicOperator();
            if (logicOperator == null) {
                logicOperator = "and";
            }
            
            log.debug("评估节点执行条件: nodeId={}, logicOperator={}, conditionCount={}", 
                    node.getId(), logicOperator, conditions.size());
            
            boolean result;
            if ("or".equals(logicOperator)) {
                // OR 逻辑：任一条件满足即可
                result = conditions.stream().anyMatch(c -> evaluateCondition(c, context));
            } else {
                // AND 逻辑：所有条件都必须满足
                result = conditions.stream().allMatch(c -> evaluateCondition(c, context));
            }
            
            log.info("节点执行条件评估结果: nodeId={}, result={}", node.getId(), result);
            return result;
            
        } catch (Exception e) {
            log.error("评估执行条件失败: nodeId={}, error={}", node.getId(), e.getMessage(), e);
            return true; // 评估失败时默认执行
        }
    }

    /**
     * 评估单个条件
     */
    private boolean evaluateCondition(ConditionItem condition, ExecutionContext context) {
        String variableKey = condition.getVariableKey();
        String operator = condition.getOperator();
        String compareValue = condition.getValue();
        
        if (variableKey == null || variableKey.isEmpty()) {
            return true; // 未配置变量，跳过此条件
        }
        
        // 解析变量值
        Object actualValue = resolveVariable(variableKey, context);
        
        log.debug("评估条件: variableKey={}, operator={}, compareValue={}, actualValue={}", 
                variableKey, operator, compareValue, actualValue);
        
        try {
            return evaluateOperator(operator, actualValue, compareValue);
        } catch (Exception e) {
            log.warn("条件评估失败: variableKey={}, operator={}, error={}", variableKey, operator, e.getMessage());
            return false;
        }
    }

    /**
     * 解析变量值
     * 支持格式: 
     * - input.fieldName - 流程输入参数
     * - context.executionId/flowId/timestamp - 全局上下文
     * - nodeId.fieldName - 节点输出
     */
    private Object resolveVariable(String variableKey, ExecutionContext context) {
        if (variableKey == null || variableKey.isEmpty()) {
            return null;
        }
        
        String[] parts = variableKey.split("\\.", 2);
        String prefix = parts[0];
        String path = parts.length > 1 ? parts[1] : null;
        
        // 特殊处理：input 表示流程输入参数
        if ("input".equals(prefix)) {
            if (path == null) {
                // 返回整个 inputs 对象
                return context.getInputs();
            }
            // 返回特定输入字段
            Object inputValue = context.getInputs().get(path.split("\\.")[0]);
            if (inputValue != null && path.contains(".")) {
                // 处理嵌套路径，如 input.data.field
                String nestedPath = path.substring(path.indexOf('.') + 1);
                return getNestedValue(inputValue, nestedPath);
            }
            return inputValue;
        }
        
        // 特殊处理：context 表示全局上下文
        if ("context".equals(prefix)) {
            if (path == null) {
                return null;
            }
            switch (path) {
                case "executionId":
                    return context.getExecutionId();
                case "flowId":
                    return context.getFlowId();
                case "timestamp":
                    return System.currentTimeMillis();
                default:
                    log.debug("未知的 context 属性: {}", path);
                    return null;
            }
        }

        // 特殊处理：var 或 variable 表示运行时变量
        if ("var".equals(prefix) || "variable".equals(prefix)) {
            if (path == null) {
                return null;
            }
            return context.getVariable(path);
        }

        // 特殊处理：const / constant / constants 表示常量
        if ("const".equals(prefix) || "constant".equals(prefix) || "constants".equals(prefix)) {
            if (path == null) {
                return null;
            }
            return context.getConstant(path);
        }
        
        // 默认处理：nodeId.path 格式，从节点输出获取
        String nodeId = prefix;
        
        // 首先尝试从节点输出获取
        Object nodeOutput = context.getNodeOutput(nodeId);
        if (nodeOutput != null) {
            if (path == null) {
                return nodeOutput;
            }
            return getNestedValue(nodeOutput, path);
        }
        
        // 尝试从全局变量获取（兼容旧格式）
        Object globalVar = context.getVariable(nodeId);
        if (globalVar != null) {
            if (path == null) {
                return globalVar;
            }
            return getNestedValue(globalVar, path);
        }
        
        // 兼容：尝试从输入参数直接获取
        Object input = context.getInputs().get(nodeId);
        if (input != null) {
            if (path == null) {
                return input;
            }
            return getNestedValue(input, path);
        }
        
        log.debug("无法解析变量: variableKey={}", variableKey);
        return null;
    }

    /**
     * 获取嵌套值
     */
    @SuppressWarnings("unchecked")
    private Object getNestedValue(Object obj, String path) {
        if (obj == null || path == null || path.isEmpty()) {
            return obj;
        }
        
        String[] parts = path.split("\\.");
        Object current = obj;
        
        for (String part : parts) {
            if (current == null) {
                return null;
            }
            
            if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(part);
            } else {
                return null;
            }
        }
        
        return current;
    }

    /**
     * 根据操作符评估条件
     */
    private boolean evaluateOperator(String operator, Object actualValue, String compareValue) {
        if (operator == null) {
            return false;
        }
        
        switch (operator) {
            // 字符串操作符
            case "contains":
                return toString(actualValue).contains(compareValue);
            case "not_contains":
                return !toString(actualValue).contains(compareValue);
            case "starts_with":
                return toString(actualValue).startsWith(compareValue);
            case "ends_with":
                return toString(actualValue).endsWith(compareValue);
            case "is":
                return toString(actualValue).equals(compareValue);
            case "is_not":
                return !toString(actualValue).equals(compareValue);
            case "is_empty":
                return isEmpty(actualValue);
            case "is_not_empty":
                return !isEmpty(actualValue);
                
            // 数值操作符
            case "equals":
                return toDouble(actualValue) == toDouble(compareValue);
            case "not_equals":
                return toDouble(actualValue) != toDouble(compareValue);
            case "greater_than":
                return toDouble(actualValue) > toDouble(compareValue);
            case "less_than":
                return toDouble(actualValue) < toDouble(compareValue);
            case "greater_than_or_equal":
                return toDouble(actualValue) >= toDouble(compareValue);
            case "less_than_or_equal":
                return toDouble(actualValue) <= toDouble(compareValue);
                
            // 布尔操作符
            case "is_true":
                return toBoolean(actualValue);
            case "is_false":
                return !toBoolean(actualValue);
                
            // 通用操作符
            case "exists":
                return actualValue != null;
            case "not_exists":
                return actualValue == null;
                
            default:
                log.warn("未知的操作符: {}", operator);
                return false;
        }
    }

    private String toString(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value);
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private double toDouble(String value) {
        if (value == null || value.isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String str = String.valueOf(value).toLowerCase();
        return "true".equals(str) || "1".equals(str) || "yes".equals(str);
    }

    private boolean isEmpty(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String) {
            return ((String) value).isEmpty();
        }
        if (value instanceof List) {
            return ((List<?>) value).isEmpty();
        }
        if (value instanceof Map) {
            return ((Map<?, ?>) value).isEmpty();
        }
        return false;
    }
}
