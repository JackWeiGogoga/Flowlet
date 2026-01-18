package com.flowlet.engine;

import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 表达式解析器
 * 提供统一的变量解析和 SpEL 表达式求值功能
 * 
 * 支持的变量格式：
 * - {{input.xxx}} 或 {{inputs.xxx}} - 流程输入参数
 * - {{var.xxx}} 或 {{variable.xxx}} - 全流程变量
 * - {{const.xxx}} 或 {{constant.xxx}} - 常量
 * - {{nodes.nodeId.field}} - 节点输出
 * - {{context.executionId/flowId/timestamp}} - 执行上下文信息
 */
@Slf4j
@Component
public class ExpressionResolver {

    private static final ExpressionParser SPEL_PARSER = new SpelExpressionParser();
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{(.+?)\\}\\}");

    /**
     * 构建 SpEL 评估上下文
     * 将执行上下文中的所有变量注册到 SpEL 上下文中
     */
    @NonNull
    public StandardEvaluationContext buildEvaluationContext(ExecutionContext context) {
        StandardEvaluationContext evalContext = new StandardEvaluationContext();

        // 添加 nodes 变量（节点输出）
        Map<String, Object> nodeOutputs = context.getNodeOutputs();
        Set<String> reservedRoots = new HashSet<>();
        if (nodeOutputs != null) {
            evalContext.setVariable("nodes", nodeOutputs);
            reservedRoots.add("nodes");
            // 同时将每个节点ID作为独立变量，方便直接访问（如 #api-1.body）
            for (Map.Entry<String, Object> entry : nodeOutputs.entrySet()) {
                evalContext.setVariable(entry.getKey(), entry.getValue());
                reservedRoots.add(entry.getKey());
            }
        }

        // 添加 input/inputs 变量（流程输入）
        Map<String, Object> inputs = context.getInputs();
        if (inputs != null) {
            evalContext.setVariable("input", inputs);
            evalContext.setVariable("inputs", inputs);
            reservedRoots.add("input");
            reservedRoots.add("inputs");
        }

        // 添加 var/variable 变量（全流程变量）
        Map<String, Object> variables = context.getAllVariables();
        if (variables != null) {
            evalContext.setVariable("var", variables);
            evalContext.setVariable("variable", variables);
            reservedRoots.add("var");
            reservedRoots.add("variable");
        }

        // 添加 const/constants 变量（常量）
        Map<String, Object> constants = context.getAllConstants();
        if (constants != null) {
            evalContext.setVariable("const", constants);
            evalContext.setVariable("constant", constants);
            evalContext.setVariable("constants", constants);
            reservedRoots.add("const");
            reservedRoots.add("constant");
            reservedRoots.add("constants");
        }

        // 添加 context 变量（执行上下文信息）
        Map<String, Object> contextInfo = new HashMap<>();
        contextInfo.put("executionId", context.getExecutionId());
        contextInfo.put("flowId", context.getFlowId());
        contextInfo.put("timestamp", System.currentTimeMillis());
        contextInfo.put("currentNodeId", context.getCurrentNodeId());
        evalContext.setVariable("context", contextInfo);
        reservedRoots.add("context");

        // 将全流程变量名提升为根变量，支持 {{alias.field}} 的写法
        if (variables != null) {
            for (Map.Entry<String, Object> entry : variables.entrySet()) {
                String key = entry.getKey();
                if (key == null || key.isEmpty() || reservedRoots.contains(key)) {
                    continue;
                }
                evalContext.setVariable(key, entry.getValue());
            }
        }

        return evalContext;
    }

    /**
     * 解析表达式并返回值
     * 支持 {{expression}} 格式，自动去除花括号
     * 
     * @param expression 表达式字符串
     * @param context 执行上下文
     * @return 解析后的值
     */
    public Object resolve(String expression, ExecutionContext context) {
        if (expression == null || expression.isEmpty()) {
            return null;
        }

        StandardEvaluationContext evalContext = buildEvaluationContext(context);
        return resolve(expression, evalContext, context);
    }

    /**
     * 解析表达式并返回值（使用已构建的 SpEL 上下文）
     * 
     * @param expression 表达式字符串
     * @param evalContext SpEL 评估上下文
     * @param context 执行上下文（用于备用路径解析）
     * @return 解析后的值
     */
    public Object resolve(String expression, @NonNull EvaluationContext evalContext, ExecutionContext context) {
        if (expression == null || expression.isEmpty()) {
            return null;
        }

        // 去除可能的 {{ }} 包裹
        String path = unwrapExpression(expression);

        if (path == null || path.isEmpty()) {
            return null;
        }

        // 检查是否是字面值（数字、布尔值、带引号的字符串等）
        Object literalValue = tryParseLiteral(path);
        if (literalValue != null) {
            return literalValue;
        }

        // 检查是否是有效的变量路径（必须包含已知的前缀或节点ID）
        if (!isValidVariablePath(path, context)) {
            // 不是有效的变量路径，当作普通字符串返回
            log.debug("表达式不是有效的变量路径，作为字面值返回: {}", path);
            return path;
        }

        // 转换为 SpEL 表达式
        String spelExpression = convertToSpelExpression(path);

        try {
            Expression exp = SPEL_PARSER.parseExpression(spelExpression);
            return exp.getValue(evalContext);
        } catch (Exception e) {
            // SpEL 解析失败，尝试直接从上下文获取
            log.debug("SpEL 表达式解析失败，尝试直接路径访问: {}", path);
            return getValueByPath(path, context);
        }
    }

    /**
     * 尝试解析字面值
     * 支持：数字、布尔值、null、带引号的字符串
     */
    private Object tryParseLiteral(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }

        // null 字面值
        if ("null".equalsIgnoreCase(value)) {
            return null;
        }

        // 布尔值
        if ("true".equalsIgnoreCase(value)) {
            return Boolean.TRUE;
        }
        if ("false".equalsIgnoreCase(value)) {
            return Boolean.FALSE;
        }

        // 带引号的字符串 "xxx" 或 'xxx'
        if ((value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.substring(1, value.length() - 1);
        }

        // 整数
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            // 不是整数
        }

        // 浮点数
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            // 不是浮点数
        }

        return null;
    }

    /**
     * 检查路径是否是有效的变量路径
     */
    private boolean isValidVariablePath(String path, ExecutionContext context) {
        if (path == null || path.isEmpty()) {
            return false;
        }

        String[] parts = path.split("\\.", 2);
        String root = parts[0];

        // 检查已知的前缀
        if ("nodes".equals(root) || "input".equals(root) || "inputs".equals(root) ||
            "var".equals(root) || "variable".equals(root) || "context".equals(root) ||
            "const".equals(root) || "constant".equals(root) || "constants".equals(root)) {
            return true;
        }

        // 检查是否是节点ID（如 api-1, transform-2 等）
        if (context != null && context.getNodeOutput(root) != null) {
            return true;
        }

        // 检查是否是全流程变量名
        if (context != null && context.getVariable(root) != null) {
            return true;
        }

        return false;
    }

    /**
     * 解析表达式并返回指定类型的值
     */
    public <T> T resolve(String expression, ExecutionContext context, Class<T> type) {
        Object value = resolve(expression, context);
        return convertToType(value, type);
    }

    /**
     * 去除表达式的 {{ }} 包裹
     */
    public String unwrapExpression(@NonNull String expression) {
        Matcher matcher = VARIABLE_PATTERN.matcher(expression.trim());
        if (matcher.matches()) {
            return matcher.group(1).trim();
        }
        return expression.trim();
    }

    /**
     * 将变量路径转换为 SpEL 表达式
     * 例如: 
     *   var.name -> #var['name']
     *   nodes.api-1.body.data -> #nodes['api-1']['body']['data']
     *   input.userId -> #input['userId']
     */
    @NonNull
    public String convertToSpelExpression(@NonNull String path) {
        if (path == null || path.isEmpty()) {
            return "null";
        }

        String[] parts = path.split("\\.");
        if (parts.length == 0) {
            return "null";
        }

        StringBuilder spel = new StringBuilder("#").append(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            String part = parts[i];
            // 使用方括号访问，支持包含特殊字符的 key（如节点ID中的连字符）
            spel.append("['").append(part).append("']");
        }

        return Objects.requireNonNull(spel.toString());
    }

    /**
     * 通过路径直接从上下文获取值（SpEL 解析失败时的备用方案）
     * 
     * 支持格式:
     * - nodes.nodeId.field - 节点输出
     * - input.paramName 或 inputs.paramName - 流程输入参数
     * - var.varName 或 variable.varName - 全流程变量
     * - context.executionId/flowId/timestamp - 执行上下文信息
     */
    public Object getValueByPath(String path, ExecutionContext context) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.", 2);
        String root = parts[0];
        String restPath = parts.length > 1 ? parts[1] : null;
        
        switch (root) {
            case "nodes":
                if (restPath == null) {
                    return context.getNodeOutputs();
                }
                return resolveNodesPath(restPath, context);

            case "input":
            case "inputs":
                if (restPath == null) {
                    return context.getInputs();
                }
                return resolveNestedPath(context.getInputs(), restPath);

            case "var":
            case "variable":
                if (restPath == null) {
                    return context.getAllVariables();
                }
                // 全流程变量通常是简单值，直接获取
                String[] varParts = restPath.split("\\.", 2);
                Object varValue = context.getVariable(varParts[0]);
                if (varParts.length > 1 && varValue instanceof Map) {
                    return getNestedValue(varValue, varParts[1]);
                }
                return varValue;

            case "const":
            case "constant":
            case "constants":
                if (restPath == null) {
                    return context.getAllConstants();
                }
                String[] constParts = restPath.split("\\.", 2);
                Object constValue = context.getConstant(constParts[0]);
                if (constParts.length > 1 && constValue instanceof Map) {
                    return getNestedValue(constValue, constParts[1]);
                }
                return constValue;

            case "context":
                return resolveContextPath(restPath, context);

            default:
                // 尝试作为节点ID处理
                Object nodeOutput = context.getNodeOutput(root);
                if (nodeOutput != null && restPath != null) {
                    return getNestedValue(nodeOutput, restPath);
                }
                return nodeOutput;
        }
    }

    /**
     * 解析 nodes.nodeId.field 路径
     */
    private Object resolveNodesPath(String path, ExecutionContext context) {
        String[] parts = path.split("\\.", 2);
        String nodeId = parts[0];
        Object nodeOutput = context.getNodeOutput(nodeId);

        if (parts.length > 1 && nodeOutput != null) {
            return getNestedValue(nodeOutput, parts[1]);
        }
        return nodeOutput;
    }

    /**
     * 解析 context.xxx 路径
     */
    private Object resolveContextPath(String path, ExecutionContext context) {
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
            case "currentNodeId":
                return context.getCurrentNodeId();
            default:
                log.debug("未知的 context 属性: {}", path);
                return null;
        }
    }

    /**
     * 解析嵌套路径（从 Map 中获取值）
     */
    private Object resolveNestedPath(Map<String, Object> map, String path) {
        if (map == null || path == null) {
            return null;
        }
        String[] parts = path.split("\\.", 2);
        Object value = map.get(parts[0]);
        if (parts.length > 1 && value instanceof Map) {
            return getNestedValue(value, parts[1]);
        }
        return value;
    }

    /**
     * 从对象中获取嵌套值
     * 支持 Map 和数组索引访问（如 items[0].name）
     */
    @SuppressWarnings("unchecked")
    public Object getNestedValue(Object obj, String path) {
        if (obj == null || path == null || path.isEmpty()) {
            return obj;
        }

        String[] parts = path.split("\\.");
        Object current = obj;

        for (String part : parts) {
            if (current == null) {
                return null;
            }

            // 检查是否有数组索引，如: items[0]
            if (part.contains("[") && part.contains("]")) {
                current = resolveArrayAccess(current, part);
            } else {
                // 普通字段访问
                if (current instanceof Map) {
                    current = ((Map<String, Object>) current).get(part);
                } else {
                    // 尝试反射访问
                    current = getPropertyByReflection(current, part);
                }
            }
        }

        return current;
    }

    /**
     * 解析数组访问表达式，如 items[0]
     */
    @SuppressWarnings("unchecked")
    private Object resolveArrayAccess(Object obj, String part) {
        int bracketIndex = part.indexOf('[');
        String fieldName = part.substring(0, bracketIndex);
        String indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
        int index = Integer.parseInt(indexStr);

        // 先获取字段
        Object fieldValue = obj;
        if (!fieldName.isEmpty()) {
            if (obj instanceof Map) {
                fieldValue = ((Map<String, Object>) obj).get(fieldName);
            } else {
                fieldValue = getPropertyByReflection(obj, fieldName);
            }
        }

        // 再从数组/列表中获取元素
        if (fieldValue instanceof List) {
            List<?> list = (List<?>) fieldValue;
            return index < list.size() ? list.get(index) : null;
        } else if (fieldValue != null && fieldValue.getClass().isArray()) {
            Object[] array = (Object[]) fieldValue;
            return index < array.length ? array[index] : null;
        }

        return null;
    }

    /**
     * 通过反射获取属性值
     */
    private Object getPropertyByReflection(Object obj, String propertyName) {
        try {
            String getterName = "get" + propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);
            java.lang.reflect.Method getter = obj.getClass().getMethod(getterName);
            return getter.invoke(obj);
        } catch (Exception e) {
            log.trace("反射获取属性失败: {} on {}", propertyName, obj.getClass().getSimpleName());
            return null;
        }
    }

    /**
     * 类型转换
     */
    @SuppressWarnings("unchecked")
    public <T> T convertToType(Object value, Class<T> type) {
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }

        try {
            if (type == String.class) {
                return (T) String.valueOf(value);
            } else if (type == Integer.class || type == int.class) {
                return (T) Integer.valueOf(toNumber(value).intValue());
            } else if (type == Long.class || type == long.class) {
                return (T) Long.valueOf(toNumber(value).longValue());
            } else if (type == Double.class || type == double.class) {
                return (T) Double.valueOf(toNumber(value).doubleValue());
            } else if (type == Boolean.class || type == boolean.class) {
                return (T) toBoolean(value);
            }
        } catch (Exception e) {
            log.warn("类型转换失败: {} -> {}", value, type.getSimpleName());
        }

        return (T) value;
    }

    private Number toNumber(Object value) {
        if (value instanceof Number) {
            return (Number) value;
        }
        try {
            String str = String.valueOf(value);
            if (str.contains(".")) {
                return Double.parseDouble(str);
            }
            return Long.parseLong(str);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String str = String.valueOf(value).toLowerCase();
        return "true".equals(str) || "1".equals(str) || "yes".equals(str);
    }
}
