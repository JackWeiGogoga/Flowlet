package com.flowlet.engine.util;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 模板解析工具类
 * 支持 {{变量名}} 格式的变量替换
 * 
 * 支持的变量格式：
 * - {{input.变量名}} - 用户输入变量
 * - {{context.executionId/flowId/timestamp}} - 上下文变量
 * - {{nodes.节点ID.属性名}} - 节点输出变量
 * - {{变量名}} - 直接访问（兼容旧格式）
 */
@Slf4j
public class TemplateResolver {

    /**
     * 匹配 {{变量名}} 格式的正则表达式
     * 变量名支持字母、数字、下划线、点号和连字符（用于访问嵌套属性和节点ID）
     */
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z_][a-zA-Z0-9_.\\-]*?)\\s*\\}\\}");

    /**
     * 解析模板字符串，替换其中的变量
     *
     * @param template 模板字符串
     * @param data     数据上下文
     * @return 解析后的字符串
     */
    public static String resolve(String template, Map<String, Object> data) {
        if (template == null || template.isEmpty()) {
            return template;
        }
        
        log.debug("解析模板: {}, 数据key: {}", template, data.keySet());
        
        if (data == null || data.isEmpty()) {
            log.warn("数据上下文为空，模板中的变量将不会被替换");
            return template;
        }

        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuffer result = new StringBuffer();

        while (matcher.find()) {
            String fullMatch = matcher.group(0);
            String variableName = matcher.group(1);
            Object value = getNestedValue(variableName, data);
            
            if (value != null) {
                String replacement = String.valueOf(value);
                log.debug("替换变量: {} -> {}", variableName, replacement);
                // 转义替换字符串中的特殊字符
                matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
            } else {
                // 变量未找到，保留原样（便于调试）
                log.warn("变量 '{}' 未在数据上下文中找到，可用的键: {}", variableName, data.keySet());
                matcher.appendReplacement(result, Matcher.quoteReplacement(fullMatch));
            }
        }
        matcher.appendTail(result);

        String resolved = result.toString();
        log.debug("模板解析结果: {}", resolved);
        return resolved;
    }

    /**
     * 解析模板Map，替换其中的变量
     *
     * @param template 模板Map
     * @param data     数据上下文
     * @return 解析后的Map
     */
    public static Map<String, Object> resolveMap(Map<String, Object> template, Map<String, Object> data) {
        if (template == null) {
            return null;
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        for (Map.Entry<String, Object> entry : template.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String) {
                result.put(entry.getKey(), resolve((String) value, data));
            } else if (value instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nestedMap = (Map<String, Object>) value;
                result.put(entry.getKey(), resolveMap(nestedMap, data));
            } else {
                result.put(entry.getKey(), value);
            }
        }
        return result;
    }

    /**
     * 获取嵌套属性值
     * 支持使用点号访问嵌套对象，如 "user.name"
     */
    @SuppressWarnings("unchecked")
    private static Object getNestedValue(String path, Map<String, Object> data) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.");
        Object current = data;

        for (String part : parts) {
            if (current == null) {
                return null;
            }
            if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(part);
            } else {
                // 尝试通过反射获取属性值
                try {
                    java.lang.reflect.Method getter = current.getClass().getMethod(
                            "get" + part.substring(0, 1).toUpperCase() + part.substring(1)
                    );
                    current = getter.invoke(current);
                } catch (Exception e) {
                    log.debug("无法获取属性值: {}.{}", current.getClass().getSimpleName(), part);
                    return null;
                }
            }
        }

        return current;
    }

    /**
     * 检查模板中是否包含变量
     */
    public static boolean containsVariables(String template) {
        if (template == null || template.isEmpty()) {
            return false;
        }
        return VARIABLE_PATTERN.matcher(template).find();
    }

    /**
     * 提取模板中的所有变量名
     */
    public static java.util.List<String> extractVariables(String template) {
        java.util.List<String> variables = new java.util.ArrayList<>();
        if (template == null || template.isEmpty()) {
            return variables;
        }

        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        while (matcher.find()) {
            variables.add(matcher.group(1));
        }
        return variables;
    }
}
