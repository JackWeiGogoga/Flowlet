package com.flowlet.engine.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.engine.util.TemplateResolver;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 变量赋值节点处理器
 * 支持三种赋值模式：
 * - set: 设置固定值（常量）
 * - assign: 直接变量赋值（变量拷贝）
 * - transform: 变量运算（对变量进行操作后赋值）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VariableAssignerNodeHandler implements NodeHandler {

    private final ObjectMapper objectMapper;
    private final ExpressionResolver expressionResolver;

    @Override
    public String getNodeType() {
        return NodeType.VARIABLE_ASSIGNER.getValue();
    }

    @Override
    @SuppressWarnings("unchecked")
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行变量赋值节点: {}", node.getId());

        Map<String, Object> config = node.getData().getConfig();
        List<Map<String, Object>> assignments = (List<Map<String, Object>>) config.get("assignments");

        if (assignments == null || assignments.isEmpty()) {
            log.warn("变量赋值节点没有配置任何赋值项: {}", node.getId());
            return NodeResult.success(Map.of("assignments", Map.of()));
        }

        Map<String, Object> results = new HashMap<>();

        for (Map<String, Object> assignment : assignments) {
            try {
                String variableName = (String) assignment.get("variableName");

                if (variableName == null || variableName.isEmpty()) {
                    log.warn("赋值项缺少变量名，跳过");
                    continue;
                }

                // 执行赋值并获取结果
                Object newValue = executeAssignment(assignment, context);

                // 将结果保存到上下文变量中
                context.setVariable(variableName, newValue);
                results.put(variableName, newValue);

                log.debug("变量赋值完成: {} = {}", variableName, newValue);

            } catch (Exception e) {
                log.error("执行赋值操作失败: {}", e.getMessage(), e);
                return NodeResult.fail("变量赋值失败: " + e.getMessage());
            }
        }

        return NodeResult.success(Map.of("assignments", results));
    }

    /**
     * 执行单个赋值操作
     */
    private Object executeAssignment(Map<String, Object> assignment, ExecutionContext context) {
        String mode = (String) assignment.get("mode");
        
        // 向后兼容：如果没有 mode 字段，使用旧逻辑
        if (mode == null || mode.isEmpty()) {
            return executeLegacyAssignment(assignment, context);
        }

        switch (mode) {
            case "set":
                return executeSetMode(assignment, context);
            case "assign":
                return executeAssignMode(assignment, context);
            case "transform":
                return executeTransformMode(assignment, context);
            default:
                throw new IllegalArgumentException("不支持的赋值模式: " + mode);
        }
    }

    /**
     * 模式 1: 设置固定值
     */
    private Object executeSetMode(Map<String, Object> assignment, ExecutionContext context) {
        String valueType = (String) assignment.get("valueType");
        Object value = assignment.get("value");

        if (valueType == null) {
            valueType = "string";
        }

        switch (valueType) {
            case "string":
                return resolveStringTemplate(value, context);
            case "number":
                return toNumber(value);
            case "boolean":
                return toBoolean(value);
            case "object":
                return parseJsonValue(value, Map.class);
            case "array":
                return parseJsonValue(value, List.class);
            default:
                return value;
        }
    }

    /**
     * 模式 2: 变量赋值（直接拷贝）
     */
    private Object executeAssignMode(Map<String, Object> assignment, ExecutionContext context) {
        String sourceExpression = (String) assignment.get("sourceExpression");
        if (sourceExpression == null || sourceExpression.isEmpty()) {
            return null;
        }
        return resolveExpression(sourceExpression, context);
    }

    /**
     * 模式 3: 变量运算
     */
    @SuppressWarnings("unchecked")
    private Object executeTransformMode(Map<String, Object> assignment, ExecutionContext context) {
        String sourceExpression = (String) assignment.get("sourceExpression");
        String operation = (String) assignment.get("operation");
        String sourceType = (String) assignment.get("sourceType");
        Map<String, Object> operationParams = (Map<String, Object>) assignment.get("operationParams");

        if (sourceExpression == null || sourceExpression.isEmpty()) {
            throw new IllegalArgumentException("变量运算模式需要指定数据来源");
        }

        if (operation == null || operation.isEmpty()) {
            throw new IllegalArgumentException("变量运算模式需要指定操作类型");
        }

        // 解析源数据
        Object sourceValue = resolveExpression(sourceExpression, context);
        
        // 如果没有指定源类型，自动推断
        if (sourceType == null || sourceType.isEmpty() || "unknown".equals(sourceType)) {
            sourceType = inferType(sourceValue);
        }

        // 解析操作参数
        OperationParams params = parseOperationParams(operationParams, context);

        // 根据源类型和操作执行变换
        return executeTransform(sourceType, operation, sourceValue, params, context);
    }

    /**
     * 执行变换操作
     */
    private Object executeTransform(String sourceType, String operation, Object sourceValue,
                                    OperationParams params, ExecutionContext context) {
        switch (sourceType) {
            case "array":
                return executeArrayTransform(operation, sourceValue, params);
            case "string":
                return executeStringTransform(operation, sourceValue, params);
            case "number":
                return executeNumberTransform(operation, sourceValue, params);
            case "object":
                return executeObjectTransform(operation, sourceValue, params);
            case "boolean":
                return executeBooleanTransform(operation, sourceValue, params);
            default:
                throw new IllegalArgumentException("不支持的源类型: " + sourceType);
        }
    }

    /**
     * 数组变换操作
     */
    @SuppressWarnings("unchecked")
    private Object executeArrayTransform(String operation, Object sourceValue, OperationParams params) {
        List<Object> list = toList(sourceValue);

        switch (operation) {
            case "get_first":
                return list.isEmpty() ? null : list.get(0);
            case "get_last":
                return list.isEmpty() ? null : list.get(list.size() - 1);
            case "get_index":
                int idx = params.arrayIndex != null ? params.arrayIndex : 0;
                if (idx < 0 || idx >= list.size()) {
                    log.warn("数组索引越界: index={}, size={}", idx, list.size());
                    return null;
                }
                return list.get(idx);
            case "length":
                return list.size();
            case "slice":
                int start = params.sliceStart != null ? params.sliceStart : 0;
                int end = params.sliceEnd != null ? params.sliceEnd : list.size();
                start = Math.max(0, Math.min(start, list.size()));
                end = Math.max(start, Math.min(end, list.size()));
                return new ArrayList<>(list.subList(start, end));
            case "reverse":
                List<Object> reversed = new ArrayList<>(list);
                java.util.Collections.reverse(reversed);
                return reversed;
            case "unique":
                return new ArrayList<>(new java.util.LinkedHashSet<>(list));
            case "join":
                String separator = params.joinSeparator != null ? params.joinSeparator : ",";
                return list.stream()
                        .map(item -> item == null ? "" : String.valueOf(item))
                        .collect(java.util.stream.Collectors.joining(separator));
            case "append":
                List<Object> appended = new ArrayList<>(list);
                Object appendValue = params.appendValue;
                if (appendValue instanceof List) {
                    appended.addAll((List<Object>) appendValue);
                } else if (appendValue != null && appendValue.getClass().isArray()) {
                    int length = java.lang.reflect.Array.getLength(appendValue);
                    for (int i = 0; i < length; i++) {
                        appended.add(java.lang.reflect.Array.get(appendValue, i));
                    }
                } else if (appendValue != null) {
                    appended.add(appendValue);
                }
                return appended;
            case "remove_first":
                if (list.isEmpty()) return list;
                List<Object> removedFirst = new ArrayList<>(list);
                removedFirst.remove(0);
                return removedFirst;
            case "remove_last":
                if (list.isEmpty()) return list;
                List<Object> removedLast = new ArrayList<>(list);
                removedLast.remove(removedLast.size() - 1);
                return removedLast;
            default:
                throw new IllegalArgumentException("不支持的数组操作: " + operation);
        }
    }

    /**
     * 字符串变换操作
     */
    private Object executeStringTransform(String operation, Object sourceValue, OperationParams params) {
        String str = sourceValue == null ? "" : String.valueOf(sourceValue);

        switch (operation) {
            case "length":
                return str.length();
            case "trim":
                return str.trim();
            case "uppercase":
                return str.toUpperCase();
            case "lowercase":
                return str.toLowerCase();
            case "regex_replace":
                return applyRegexReplace(str, params.regexPattern, params.regexFlags, params.regexReplace);
            case "regex_extract":
                return applyRegexExtract(str, params.regexPattern, params.regexFlags, 
                        params.regexGroup != null ? params.regexGroup : 0);
            default:
                throw new IllegalArgumentException("不支持的字符串操作: " + operation);
        }
    }

    /**
     * 数字变换操作
     */
    private Object executeNumberTransform(String operation, Object sourceValue, OperationParams params) {
        double num = toDouble(sourceValue);
        double operand = params.arithmeticValue != null ? params.arithmeticValue : 0;

        switch (operation) {
            case "add":
                return num + operand;
            case "subtract":
                return num - operand;
            case "multiply":
                return num * operand;
            case "divide":
                if (operand == 0) {
                    throw new ArithmeticException("除数不能为零");
                }
                return num / operand;
            case "round":
                return Math.round(num);
            case "floor":
                return Math.floor(num);
            case "ceil":
                return Math.ceil(num);
            case "abs":
                return Math.abs(num);
            default:
                throw new IllegalArgumentException("不支持的数字操作: " + operation);
        }
    }

    /**
     * 对象变换操作
     */
    @SuppressWarnings("unchecked")
    private Object executeObjectTransform(String operation, Object sourceValue, OperationParams params) {
        Map<String, Object> map = sourceValue instanceof Map 
                ? (Map<String, Object>) sourceValue 
                : new HashMap<>();

        switch (operation) {
            case "get_field":
                return getFieldByPath(map, params.fieldPath);
            case "keys":
                return new ArrayList<>(map.keySet());
            case "values":
                return new ArrayList<>(map.values());
            default:
                throw new IllegalArgumentException("不支持的对象操作: " + operation);
        }
    }

    /**
     * 布尔变换操作
     */
    private Object executeBooleanTransform(String operation, Object sourceValue, OperationParams params) {
        boolean bool = toBoolean(sourceValue);

        switch (operation) {
            case "not":
                return !bool;
            default:
                throw new IllegalArgumentException("不支持的布尔操作: " + operation);
        }
    }

    /**
     * 根据路径获取对象字段
     */
    @SuppressWarnings("unchecked")
    private Object getFieldByPath(Map<String, Object> map, String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.");
        Object current = map;

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
     * 解析操作参数
     */
    private OperationParams parseOperationParams(Map<String, Object> params, ExecutionContext context) {
        OperationParams result = new OperationParams();
        if (params == null) {
            return result;
        }

        result.arrayIndex = toInteger(params.get("arrayIndex"));
        result.sliceStart = toInteger(params.get("sliceStart"));
        result.sliceEnd = toInteger(params.get("sliceEnd"));
        result.joinSeparator = (String) params.get("joinSeparator");
        
        // 算术值：支持变量或固定值
        Boolean arithmeticUseVariable = (Boolean) params.get("arithmeticUseVariable");
        if (Boolean.TRUE.equals(arithmeticUseVariable)) {
            String arithmeticExpression = (String) params.get("arithmeticExpression");
            if (arithmeticExpression != null && !arithmeticExpression.isEmpty()) {
                Object resolved = resolveExpression(arithmeticExpression, context);
                result.arithmeticValue = toDouble(resolved);
            }
        } else {
            result.arithmeticValue = toDouble(params.get("arithmeticValue"));
        }

        // 正则参数
        result.regexPattern = (String) params.get("regexPattern");
        result.regexFlags = (String) params.get("regexFlags");
        result.regexReplace = (String) params.get("regexReplace");
        result.regexGroup = toInteger(params.get("regexGroup"));

        // 对象字段路径
        result.fieldPath = (String) params.get("fieldPath");

        // 追加值：解析表达式
        Object appendValueRaw = params.get("appendValue");
        if (appendValueRaw instanceof String) {
            String appendExpr = (String) appendValueRaw;
            if (appendExpr.contains("{{")) {
                result.appendValue = resolveExpression(appendExpr, context);
            } else {
                // 尝试解析为 JSON
                try {
                    result.appendValue = objectMapper.readValue(appendExpr, Object.class);
                } catch (Exception e) {
                    result.appendValue = appendExpr;
                }
            }
        } else {
            result.appendValue = appendValueRaw;
        }

        return result;
    }

    /**
     * 操作参数封装类
     */
    private static class OperationParams {
        Integer arrayIndex;
        Integer sliceStart;
        Integer sliceEnd;
        String joinSeparator;
        Double arithmeticValue;
        String regexPattern;
        String regexFlags;
        String regexReplace;
        Integer regexGroup;
        String fieldPath;
        Object appendValue;
    }

    /**
     * 推断值类型
     */
    private String inferType(Object value) {
        if (value == null) return "unknown";
        if (value instanceof List || value.getClass().isArray()) return "array";
        if (value instanceof Map) return "object";
        if (value instanceof Number) return "number";
        if (value instanceof Boolean) return "boolean";
        if (value instanceof String) return "string";
        return "unknown";
    }

    /**
     * 转换为 List
     */
    @SuppressWarnings("unchecked")
    private List<Object> toList(Object value) {
        if (value == null) return new ArrayList<>();
        if (value instanceof List) return new ArrayList<>((List<Object>) value);
        if (value.getClass().isArray()) {
            List<Object> list = new ArrayList<>();
            int length = java.lang.reflect.Array.getLength(value);
            for (int i = 0; i < length; i++) {
                list.add(java.lang.reflect.Array.get(value, i));
            }
            return list;
        }
        List<Object> list = new ArrayList<>();
        list.add(value);
        return list;
    }

    // ==================== 向后兼容：旧逻辑 ====================

    /**
     * 执行旧格式的赋值（向后兼容）
     */
    private Object executeLegacyAssignment(Map<String, Object> assignment, ExecutionContext context) {
        String variableName = (String) assignment.get("variableName");
        String variableType = (String) assignment.get("variableType");
        String operation = (String) assignment.get("operation");
        String sourceExpression = (String) assignment.get("sourceExpression");
        Object setValue = assignment.get("setValue");
        Number arithmeticValue = (Number) assignment.get("arithmeticValue");
        String regexPattern = (String) assignment.get("regexPattern");
        String regexFlags = (String) assignment.get("regexFlags");
        String regexReplace = (String) assignment.get("regexReplace");
        Object regexGroup = assignment.get("regexGroup");
        Boolean arithmeticUseVariable = (Boolean) assignment.get("arithmeticUseVariable");
        String arithmeticExpression = (String) assignment.get("arithmeticExpression");
        Integer arrayIndex = toInteger(assignment.get("arrayIndex"));
        Integer sliceStart = toInteger(assignment.get("sliceStart"));
        Integer sliceEnd = toInteger(assignment.get("sliceEnd"));
        String joinSeparator = (String) assignment.get("joinSeparator");

        // 获取当前变量值
        Object currentValue = context.getVariable(variableName);

        // 如果使用变量作为算术运算数，解析变量表达式
        Number effectiveArithmeticValue = arithmeticValue;
        if (Boolean.TRUE.equals(arithmeticUseVariable) && arithmeticExpression != null && !arithmeticExpression.isEmpty()) {
            Object resolvedValue = resolveExpression(arithmeticExpression, context);
            effectiveArithmeticValue = toNumber(resolvedValue);
            log.debug("算术运算使用变量: {} -> {}", arithmeticExpression, effectiveArithmeticValue);
        }

        // 根据操作类型执行相应逻辑
        return executeLegacyOperation(
                variableType, operation, currentValue,
                sourceExpression, setValue, effectiveArithmeticValue,
                regexPattern, regexFlags, regexReplace, regexGroup,
                arrayIndex, sliceStart, sliceEnd, joinSeparator, context
        );
    }

    /**
     * 旧的操作执行逻辑（向后兼容）
     */
    private Object executeLegacyOperation(String variableType, String operation,
                                          Object currentValue, String sourceExpression,
                                          Object setValue, Number arithmeticValue,
                                          String regexPattern, String regexFlags,
                                          String regexReplace, Object regexGroup,
                                          Integer arrayIndex, Integer sliceStart,
                                          Integer sliceEnd, String joinSeparator,
                                          ExecutionContext context) {

        Object sourceValue = null;
        if (sourceExpression != null && !sourceExpression.isEmpty()) {
            sourceValue = resolveExpression(sourceExpression, context);
        }

        switch (variableType) {
            case "string":
                return executeLegacyStringOperation(
                        operation, currentValue, sourceValue, setValue,
                        regexPattern, regexFlags, regexReplace, regexGroup, context
                );
            case "number":
                return executeLegacyNumberOperation(operation, currentValue, sourceValue, setValue, arithmeticValue);
            case "object":
                return executeLegacyObjectOperation(operation, currentValue, sourceValue, setValue);
            case "array":
                return executeLegacyArrayOperation(operation, currentValue, sourceValue, setValue,
                        arrayIndex, sliceStart, sliceEnd, joinSeparator);
            default:
                throw new IllegalArgumentException("不支持的变量类型: " + variableType);
        }
    }

    private Object executeLegacyStringOperation(String operation, Object currentValue,
                                                Object sourceValue, Object setValue,
                                                String regexPattern, String regexFlags,
                                                String regexReplace, Object regexGroup,
                                                ExecutionContext context) {
        switch (operation) {
            case "overwrite":
                return sourceValue != null ? String.valueOf(sourceValue) : "";
            case "clear":
                return "";
            case "set":
                return resolveStringTemplate(setValue, context);
            case "regex_replace":
                return applyRegexReplace(
                        sourceValue != null ? sourceValue : currentValue,
                        regexPattern, regexFlags, regexReplace
                );
            case "regex_extract":
                return applyRegexExtract(
                        sourceValue != null ? sourceValue : currentValue,
                        regexPattern, regexFlags, parseRegexGroup(regexGroup)
                );
            default:
                throw new IllegalArgumentException("不支持的字符串操作: " + operation);
        }
    }

    private Object executeLegacyNumberOperation(String operation, Object currentValue,
                                                Object sourceValue, Object setValue,
                                                Number arithmeticValue) {
        switch (operation) {
            case "overwrite":
                return toNumber(sourceValue);
            case "clear":
                return null;
            case "set":
                return toNumber(setValue);
            case "length":
                Object lengthSource = sourceValue != null ? sourceValue : currentValue;
                return getStringLength(lengthSource);
            case "add":
                return toDouble(currentValue) + toDouble(arithmeticValue);
            case "subtract":
                return toDouble(currentValue) - toDouble(arithmeticValue);
            case "multiply":
                return toDouble(currentValue) * toDouble(arithmeticValue);
            case "divide":
                double divisor = toDouble(arithmeticValue);
                if (divisor == 0) {
                    throw new ArithmeticException("除数不能为零");
                }
                return toDouble(currentValue) / divisor;
            default:
                throw new IllegalArgumentException("不支持的数字操作: " + operation);
        }
    }

    private Object executeLegacyObjectOperation(String operation, Object currentValue,
                                                Object sourceValue, Object setValue) {
        switch (operation) {
            case "overwrite":
                return sourceValue instanceof Map ? sourceValue : new HashMap<>();
            case "clear":
                return new HashMap<>();
            case "set":
                return parseJsonValue(setValue, Map.class);
            default:
                throw new IllegalArgumentException("不支持的对象操作: " + operation);
        }
    }

    @SuppressWarnings("unchecked")
    private Object executeLegacyArrayOperation(String operation, Object currentValue,
                                               Object sourceValue, Object setValue,
                                               Integer arrayIndex, Integer sliceStart,
                                               Integer sliceEnd, String joinSeparator) {
        List<Object> currentList = currentValue instanceof List
                ? new ArrayList<>((List<Object>) currentValue)
                : new ArrayList<>();

        switch (operation) {
            case "overwrite":
                return sourceValue instanceof List ? sourceValue : new ArrayList<>();
            case "clear":
                return new ArrayList<>();
            case "set":
                return parseJsonValue(setValue, List.class);
            case "append":
                if (sourceValue instanceof List) {
                    currentList.addAll((List<Object>) sourceValue);
                } else if (sourceValue != null && sourceValue.getClass().isArray()) {
                    int length = java.lang.reflect.Array.getLength(sourceValue);
                    for (int i = 0; i < length; i++) {
                        currentList.add(java.lang.reflect.Array.get(sourceValue, i));
                    }
                } else {
                    currentList.add(sourceValue);
                }
                return currentList;
            case "extend":
                if (sourceValue instanceof List) {
                    currentList.addAll((List<Object>) sourceValue);
                }
                return currentList;
            case "remove_first":
                if (!currentList.isEmpty()) {
                    currentList.remove(0);
                }
                return currentList;
            case "remove_last":
                if (!currentList.isEmpty()) {
                    currentList.remove(currentList.size() - 1);
                }
                return currentList;
            case "get_first":
                return currentList.isEmpty() ? null : currentList.get(0);
            case "get_last":
                return currentList.isEmpty() ? null : currentList.get(currentList.size() - 1);
            case "get_index":
                int idx = arrayIndex != null ? arrayIndex : 0;
                if (idx < 0 || idx >= currentList.size()) {
                    log.warn("数组索引越界: index={}, size={}", idx, currentList.size());
                    return null;
                }
                return currentList.get(idx);
            case "length":
                return currentList.size();
            case "reverse":
                java.util.Collections.reverse(currentList);
                return currentList;
            case "unique":
                return new ArrayList<>(new java.util.LinkedHashSet<>(currentList));
            case "slice":
                int start = sliceStart != null ? sliceStart : 0;
                int end = sliceEnd != null ? sliceEnd : currentList.size();
                start = Math.max(0, Math.min(start, currentList.size()));
                end = Math.max(start, Math.min(end, currentList.size()));
                return new ArrayList<>(currentList.subList(start, end));
            case "join":
                String separator = joinSeparator != null ? joinSeparator : ",";
                return currentList.stream()
                        .map(item -> item == null ? "" : String.valueOf(item))
                        .collect(java.util.stream.Collectors.joining(separator));
            default:
                throw new IllegalArgumentException("不支持的数组操作: " + operation);
        }
    }

    // ==================== 通用工具方法 ====================

    private Object resolveExpression(String expression, ExecutionContext context) {
        if (expression == null || expression.isEmpty()) {
            return null;
        }
        return expressionResolver.resolve(expression, context);
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Number toNumber(Object value) {
        if (value == null) return 0;
        if (value instanceof Number) return (Number) value;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double toDouble(Object value) {
        Number num = toNumber(value);
        return num != null ? num.doubleValue() : 0.0;
    }

    private boolean toBoolean(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean) return (Boolean) value;
        String str = String.valueOf(value).toLowerCase();
        return "true".equals(str) || "1".equals(str) || "yes".equals(str);
    }

    private String resolveStringTemplate(Object value, ExecutionContext context) {
        if (value == null) {
            return "";
        }
        String raw = String.valueOf(value);
        if (!TemplateResolver.containsVariables(raw)) {
            return raw;
        }
        return TemplateResolver.resolve(raw, context.getAllData());
    }

    private int getStringLength(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof CharSequence) {
            return ((CharSequence) value).length();
        }
        return String.valueOf(value).length();
    }

    private String applyRegexReplace(Object value, String pattern, String flags, String replacement) {
        if (value == null || pattern == null || pattern.isEmpty()) {
            return value == null ? "" : String.valueOf(value);
        }
        java.util.regex.Pattern compiled = compileRegex(pattern, flags);
        java.util.regex.Matcher matcher = compiled.matcher(String.valueOf(value));
        String safeReplacement = replacement == null ? "" : replacement;
        return matcher.replaceAll(safeReplacement);
    }

    private String applyRegexExtract(Object value, String pattern, String flags, int groupIndex) {
        if (value == null || pattern == null || pattern.isEmpty()) {
            return "";
        }
        java.util.regex.Pattern compiled = compileRegex(pattern, flags);
        java.util.regex.Matcher matcher = compiled.matcher(String.valueOf(value));
        if (!matcher.find()) {
            return "";
        }
        int group = Math.max(groupIndex, 0);
        return group <= matcher.groupCount() ? matcher.group(group) : "";
    }

    private int parseRegexGroup(Object regexGroup) {
        if (regexGroup instanceof Number) {
            return ((Number) regexGroup).intValue();
        }
        if (regexGroup instanceof String) {
            try {
                return Integer.parseInt((String) regexGroup);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private java.util.regex.Pattern compileRegex(String pattern, String flags) {
        int flagValue = 0;
        if (flags != null && !flags.isEmpty()) {
            for (char flag : flags.toCharArray()) {
                switch (flag) {
                    case 'i':
                        flagValue |= java.util.regex.Pattern.CASE_INSENSITIVE;
                        break;
                    case 'm':
                        flagValue |= java.util.regex.Pattern.MULTILINE;
                        break;
                    case 's':
                        flagValue |= java.util.regex.Pattern.DOTALL;
                        break;
                    case 'u':
                        flagValue |= java.util.regex.Pattern.UNICODE_CASE;
                        break;
                    default:
                        break;
                }
            }
        }
        return java.util.regex.Pattern.compile(pattern, flagValue);
    }

    @SuppressWarnings("unchecked")
    private <T> T parseJsonValue(Object value, Class<T> clazz) {
        if (value == null) {
            return clazz == Map.class ? (T) new HashMap<>() : (T) new ArrayList<>();
        }
        if (clazz.isInstance(value)) {
            return (T) value;
        }
        if (value instanceof String) {
            try {
                return objectMapper.readValue((String) value, clazz);
            } catch (Exception e) {
                log.warn("JSON解析失败: {}", e.getMessage());
                return clazz == Map.class ? (T) new HashMap<>() : (T) new ArrayList<>();
            }
        }
        return clazz == Map.class ? (T) new HashMap<>() : (T) new ArrayList<>();
    }
}
