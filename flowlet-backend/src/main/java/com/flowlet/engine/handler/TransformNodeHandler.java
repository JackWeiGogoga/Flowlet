package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据转换节点处理器
 * 支持两种模式：
 * 1. 字段映射模式（mapping）- 可视化字段选择和映射
 * 2. 高级表达式模式（advanced）- SpEL 脚本自定义转换
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransformNodeHandler implements NodeHandler {

    private final ExpressionResolver expressionResolver;
    private final ExpressionParser parser = new SpelExpressionParser();

    @Override
    public String getNodeType() {
        return NodeType.TRANSFORM.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行数据转换节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("数据转换节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        
        // 检查配置模式
        String mode = (String) config.getOrDefault("mode", "mapping");
        
        try {
            Map<String, Object> result;
            
            if ("advanced".equals(mode)) {
                // 高级模式：使用 SpEL 脚本
                result = executeAdvancedMode(config, context);
            } else {
                // 映射模式：使用字段映射
                result = executeMappingMode(config, context);
            }

            log.info("数据转换完成: mode={}, resultSize={}", mode, result.size());
            return NodeResult.success(result);

        } catch (Exception e) {
            log.error("数据转换失败: {}", e.getMessage(), e);
            return NodeResult.fail("数据转换失败: " + e.getMessage());
        }
    }

    /**
     * 执行字段映射模式
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> executeMappingMode(Map<String, Object> config, ExecutionContext context) {
        List<Map<String, Object>> mappings = (List<Map<String, Object>>) config.get("mappings");
        
        if (mappings == null || mappings.isEmpty()) {
            log.warn("字段映射配置为空，返回空结果");
            return new HashMap<>();
        }

        // 构建 SpEL 上下文
        StandardEvaluationContext evalContext = expressionResolver.buildEvaluationContext(context);
        Map<String, Object> result = new HashMap<>();

        for (Map<String, Object> mapping : mappings) {
            String target = (String) mapping.get("target");
            String source = (String) mapping.get("source");
            String expression = (String) mapping.get("expression");
            String regexMode = (String) mapping.get("regexMode");
            String regexPattern = (String) mapping.get("regexPattern");
            String regexFlags = (String) mapping.get("regexFlags");
            String regexReplace = (String) mapping.get("regexReplace");
            Object regexGroup = mapping.get("regexGroup");

            if (target == null || target.trim().isEmpty()) {
                continue;
            }

            try {
                Object value = null;
                
                // 如果有自定义表达式，优先使用
                if (expression != null && !expression.trim().isEmpty()) {
                    value = evaluateExpression(expression, evalContext);
                } 
                // 否则从 source 路径提取数据
                else if (source != null && !source.trim().isEmpty()) {
                    value = extractSourceValue(source, context);
                }

                Object finalValue = applyRegexIfNeeded(
                        value,
                        regexMode,
                        regexPattern,
                        regexFlags,
                        regexReplace,
                        regexGroup
                );
                result.put(target, finalValue);
                log.debug("字段映射: source={}, target={}, value={}", source, target, value);
                
            } catch (Exception e) {
                log.warn("字段映射失败: source={}, target={}, error={}", source, target, e.getMessage());
                result.put(target, null);
            }
        }

        return result;
    }

    /**
     * 执行高级表达式模式
     */
    private Map<String, Object> executeAdvancedMode(Map<String, Object> config, ExecutionContext context) {
        String script = (String) config.get("advancedScript");
        
        if (script == null || script.trim().isEmpty()) {
            return new HashMap<>();
        }

        // 构建 SpEL 上下文
        StandardEvaluationContext evalContext = expressionResolver.buildEvaluationContext(context);

        try {
            // 解析并执行 SpEL 脚本
            Expression exp = parser.parseExpression(script);
            Object result = exp.getValue(evalContext);
            
            // 确保返回 Map 类型
            if (result instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> mapResult = (Map<String, Object>) result;
                return mapResult;
            } else {
                Map<String, Object> wrappedResult = new HashMap<>();
                wrappedResult.put("result", result);
                return wrappedResult;
            }
            
        } catch (Exception e) {
            log.error("高级表达式执行失败: {}", e.getMessage(), e);
            throw new RuntimeException("SpEL 表达式解析失败: " + e.getMessage());
        }
    }

    /**
     * 从 source 路径提取值
     * 使用统一的表达式解析器
     */
    private Object extractSourceValue(String source, ExecutionContext context) {
        // 使用统一的路径解析
        Object value = expressionResolver.getValueByPath(source, context);
        
        if (value == null) {
            // 尝试兼容旧格式：nodeId.field
            String[] parts = source.split("\\.", 2);
            if (parts.length >= 2) {
                String nodeId = parts[0];
                String fieldPath = parts[1];
                Object nodeOutput = context.getNodeOutput(nodeId);
                if (nodeOutput != null) {
                    value = expressionResolver.getNestedValue(nodeOutput, fieldPath);
                }
            }
        }
        
        return value;
    }

    /**
     * 求值 SpEL 表达式
     */
    private Object evaluateExpression(@NonNull String expression, @NonNull StandardEvaluationContext evalContext) {
        try {
            Expression exp = parser.parseExpression(expression);
            return exp.getValue(evalContext);
        } catch (Exception e) {
            log.warn("表达式求值失败: expression={}, error={}", expression, e.getMessage());
            throw e;
        }
    }

    private Object applyRegexIfNeeded(
            Object value,
            String regexMode,
            String pattern,
            String flags,
            String replacement,
            Object groupValue
    ) {
        if (regexMode == null || regexMode.isEmpty() || "none".equals(regexMode)) {
            return value;
        }

        String raw = value == null ? "" : String.valueOf(value);
        if (pattern == null || pattern.isEmpty()) {
            return raw;
        }

        java.util.regex.Pattern compiled = compileRegex(pattern, flags);
        java.util.regex.Matcher matcher = compiled.matcher(raw);

        switch (regexMode) {
            case "replace":
                String safeReplacement = replacement == null ? "" : replacement;
                return matcher.replaceAll(safeReplacement);
            case "extract":
                if (!matcher.find()) {
                    return "";
                }
                int groupIndex = parseRegexGroup(groupValue);
                int safeGroup = Math.max(groupIndex, 0);
                return safeGroup <= matcher.groupCount() ? matcher.group(safeGroup) : "";
            case "match":
                return matcher.find();
            default:
                return value;
        }
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
}
