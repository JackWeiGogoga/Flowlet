package com.flowlet.engine.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 条件判断节点处理器
 * 支持 IF/ELIF/ELSE 多分支条件判断
 * 按顺序评估每个分支的条件，返回第一个满足条件的分支的 handleId
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConditionNodeHandler implements NodeHandler {

    private final ExpressionResolver expressionResolver;
    private final ExpressionParser parser = new SpelExpressionParser();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // 匹配 {{variable.path}} 格式的正则表达式
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{([^}]+)}}");

    @Override
    public String getNodeType() {
        return NodeType.CONDITION.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行条件节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("条件节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String expression = (String) config.get("expression");
        if (expression == null || expression.isEmpty()) {
            return NodeResult.fail("条件表达式不能为空");
        }

        try {
            // 使用统一的表达式解析器构建SpEL上下文
            StandardEvaluationContext evalContext = expressionResolver.buildEvaluationContext(context);
            Map<String, Object> allData = context.getAllData();

            // 尝试解析新的 JSON 格式（多分支）
            String matchedHandleId = evaluateBranchConditions(expression, evalContext, allData);
            
            if (matchedHandleId != null) {
                // 新格式：返回匹配的 handleId
                log.info("条件判断结果: matchedHandleId={}", matchedHandleId);
                
                Map<String, Object> output = new HashMap<>();
                output.put("matchedHandleId", matchedHandleId);
                output.put("result", "true".equals(matchedHandleId)); // 向后兼容
                output.put("expression", expression);
                
                return NodeResult.success(output);
            }

            // 兼容旧格式：简单的布尔表达式
            String spelExpression = convertToSpelExpression(expression, allData);
            if (spelExpression == null || spelExpression.isEmpty()) {
                return NodeResult.fail("表达式转换失败: " + expression);
            }
            log.debug("原始表达式: {}, SpEL表达式: {}", expression, spelExpression);

            Expression exp = parser.parseExpression(spelExpression);
            Boolean result = exp.getValue(evalContext, Boolean.class);

            log.info("条件判断结果(旧格式): expression={}, result={}", expression, result);

            Map<String, Object> output = new HashMap<>();
            output.put("result", result);
            output.put("matchedHandleId", result ? "true" : "false");
            output.put("expression", expression);

            return NodeResult.success(output);

        } catch (Exception e) {
            log.error("条件表达式执行失败: expression={}, error={}", expression, e.getMessage(), e);
            return NodeResult.fail("条件表达式执行失败: " + e.getMessage());
        }
    }

    /**
     * 评估多分支条件配置
     * 按顺序评估每个分支，返回第一个满足条件的分支的 handleId
     * 如果没有分支满足条件，返回 elseHandleId
     *
     * @param expression JSON 格式的分支配置
     * @param evalContext SpEL 评估上下文
     * @param contextData 上下文数据
     * @return 匹配的 handleId，如果不是新格式返回 null
     */
    @SuppressWarnings("unchecked")
    private String evaluateBranchConditions(String expression, @NonNull StandardEvaluationContext evalContext, 
                                             Map<String, Object> contextData) {
        // 尝试解析为 JSON
        if (!expression.trim().startsWith("{")) {
            return null; // 不是 JSON 格式，使用旧逻辑
        }

        try {
            Map<String, Object> evalConfig = objectMapper.readValue(expression, Map.class);
            
            List<Map<String, Object>> branches = (List<Map<String, Object>>) evalConfig.get("branches");
            String elseHandleId = (String) evalConfig.get("elseHandleId");
            
            if (branches == null || branches.isEmpty()) {
                log.warn("分支配置为空，使用默认 else 分支");
                return elseHandleId != null ? elseHandleId : "false";
            }

            // 按顺序评估每个分支
            for (Map<String, Object> branch : branches) {
                String branchId = (String) branch.get("branchId");
                String type = (String) branch.get("type");
                String handleId = (String) branch.get("handleId");
                String branchExpression = (String) branch.get("expression");
                
                if (branchExpression == null || branchExpression.isEmpty()) {
                    log.warn("分支 {} 的表达式为空，跳过", branchId);
                    continue;
                }

                try {
                    // 转换并评估表达式
                    String spelExpression = convertToSpelExpression(branchExpression, contextData);
                    if (spelExpression == null || spelExpression.isEmpty()) {
                        log.warn("分支 {} 表达式转换失败: {}", branchId, branchExpression);
                        continue;
                    }
                    log.debug("评估分支 {}: type={}, expression={}, spelExpression={}", 
                              branchId, type, branchExpression, spelExpression);
                    
                    Expression exp = parser.parseExpression(spelExpression);
                    Boolean result = exp.getValue(evalContext, Boolean.class);
                    
                    log.debug("分支 {} 评估结果: {}", branchId, result);
                    
                    if (Boolean.TRUE.equals(result)) {
                        log.info("分支 {} ({}) 条件满足，返回 handleId={}", branchId, type, handleId);
                        return handleId;
                    }
                } catch (Exception e) {
                    log.warn("分支 {} 表达式评估失败: {}, error={}", branchId, branchExpression, e.getMessage());
                    // 继续评估下一个分支
                }
            }

            // 没有分支满足条件，返回 else 分支
            log.info("所有分支条件都不满足，返回 else 分支: {}", elseHandleId);
            return elseHandleId != null ? elseHandleId : "false";
            
        } catch (JsonProcessingException e) {
            log.debug("表达式不是有效的 JSON 格式，使用旧逻辑: {}", e.getMessage());
            return null; // 不是有效的 JSON，使用旧逻辑
        }
    }

    /**
     * 将前端表达式格式转换为 SpEL 表达式格式
     * 例如: {{input.name}} === 'test' -> #input['name'] == 'test'
     * 
     * @param expression 前端格式的表达式
     * @param contextData 上下文数据，用于解析嵌套路径
     * @return SpEL 格式的表达式
     */
    private String convertToSpelExpression(String expression, Map<String, Object> contextData) {
        if (expression == null || expression.isEmpty()) {
            return expression;
        }

        String result = expression;

        // 1. 替换 {{variable.path}} 为 SpEL 变量引用格式
        Matcher matcher = VARIABLE_PATTERN.matcher(result);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String variablePath = matcher.group(1); // e.g., "input.name" or "nodes.nodeId.field"
            String spelRef = convertVariablePathToSpel(variablePath);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(spelRef));
        }
        matcher.appendTail(sb);
        result = sb.toString();

        // 2. 替换 JavaScript 操作符为 SpEL 操作符
        result = result.replace("===", "==");
        result = result.replace("!==", "!=");
        result = result.replace("&&", " and ");
        result = result.replace("||", " or ");
        
        // 3. 替换 JavaScript 方法为 SpEL 方法
        // includes() -> contains()
        result = result.replaceAll("\\.includes\\(", ".contains(");
        // startsWith() 和 endsWith() 在 SpEL 中是一样的
        
        return result;
    }

    /**
     * 将变量路径转换为 SpEL 引用格式
     * 例如: 
     *   "input.name" -> "#input['name']"
     *   "nodes.nodeId.field" -> "#nodes['nodeId']['field']"
     *   "context.executionId" -> "#context['executionId']"
     * 
     * @param variablePath 变量路径，如 "input.name"
     * @return SpEL 变量引用格式
     */
    private String convertVariablePathToSpel(String variablePath) {
        if (variablePath == null || variablePath.isEmpty()) {
            return "null";
        }

        String[] parts = variablePath.split("\\.");
        if (parts.length == 0) {
            return "null";
        }

        StringBuilder spelRef = new StringBuilder("#").append(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            spelRef.append("['").append(parts[i]).append("']");
        }

        return spelRef.toString();
    }
}
