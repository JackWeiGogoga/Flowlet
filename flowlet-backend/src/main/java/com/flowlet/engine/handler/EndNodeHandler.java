package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 结束节点处理器
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EndNodeHandler implements NodeHandler {

    private final ExpressionResolver expressionResolver;

    @Override
    public String getNodeType() {
        return NodeType.END.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行结束节点: {}", node.getId());

        // 创建一个新的简单 Map 来存储结果，避免循环引用
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "completed");
        result.put("message", "流程执行完成");

        // 获取节点配置
        Map<String, Object> config = node.getData().getConfig();
        
        // 检查是否配置了输出变量
        if (config != null && config.containsKey("outputVariables")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> outputVariables = (List<Map<String, Object>>) config.get("outputVariables");
            
            if (outputVariables != null && !outputVariables.isEmpty()) {
                Map<String, Object> outputs = extractOutputVariables(outputVariables, context);
                result.put("outputs", outputs);
                log.info("结束节点提取了 {} 个输出变量", outputs.size());
            }
        }
        
        // 同时保留完整的节点输出（用于调试）
        Map<String, Object> nodeOutputs = context.getNodeOutputs();
        if (nodeOutputs != null) {
            result.put("nodeOutputs", new HashMap<>(nodeOutputs));
        }
        
        return NodeResult.success(result);
    }

    /**
     * 根据配置的输出变量从上下文中提取值
     */
    private Map<String, Object> extractOutputVariables(List<Map<String, Object>> outputVariables, ExecutionContext context) {
        Map<String, Object> outputs = new LinkedHashMap<>();
        
        for (Map<String, Object> varConfig : outputVariables) {
            String name = (String) varConfig.get("name");
            String expression = (String) varConfig.get("expression");
            String type = (String) varConfig.get("type");
            
            if (name == null || expression == null) {
                continue;
            }
            
            try {
                // 使用统一的表达式解析器
                Object value = expressionResolver.resolve(expression, context);
                // 根据类型进行转换
                value = convertToType(value, type);
                outputs.put(name, value);
                log.debug("提取输出变量: {} = {} (表达式: {})", name, value, expression);
            } catch (Exception e) {
                log.warn("提取输出变量 {} 失败，表达式: {}, 错误: {}", name, expression, e.getMessage());
                outputs.put(name, null);
            }
        }
        
        return outputs;
    }

    /**
     * 将值转换为指定类型
     */
    private Object convertToType(Object value, String type) {
        if (value == null || type == null) {
            return value;
        }
        
        try {
            switch (type) {
                case "string":
                    return value.toString();
                case "number":
                    if (value instanceof Number) {
                        return value;
                    }
                    String str = value.toString();
                    if (str.contains(".")) {
                        return Double.parseDouble(str);
                    }
                    return Long.parseLong(str);
                case "boolean":
                    if (value instanceof Boolean) {
                        return value;
                    }
                    return Boolean.parseBoolean(value.toString());
                case "object":
                case "array":
                    // 保持原样
                    return value;
                default:
                    return value;
            }
        } catch (Exception e) {
            log.warn("类型转换失败: {} -> {}, 保持原值", value, type);
            return value;
        }
    }
}
