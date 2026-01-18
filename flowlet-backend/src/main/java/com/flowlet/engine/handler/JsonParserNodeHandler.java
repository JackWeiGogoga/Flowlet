package com.flowlet.engine.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.dto.datastructure.DataStructureResponse;
import com.flowlet.dto.datastructure.FieldDefinitionDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.service.DataStructureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * JSON 解析器节点处理器
 * 将 JSON 字符串解析为结构化数据，供后续节点使用
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JsonParserNodeHandler implements NodeHandler {

    private final ExpressionResolver expressionResolver;
    private final DataStructureService dataStructureService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getNodeType() {
        return "json_parser";
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        Map<String, Object> config = node.getData().getConfig();
        String nodeId = node.getId();
        
        log.info("执行 JSON 解析器节点: {}", nodeId);
        
        try {
            // 获取数据来源表达式
            String sourceExpression = (String) config.get("sourceExpression");
            if (sourceExpression == null || sourceExpression.isBlank()) {
                return NodeResult.fail("sourceExpression is required");
            }
            
            // 使用 ExpressionResolver 解析表达式获取 JSON 数据
            Object sourceData = expressionResolver.resolve(sourceExpression, context);
            String jsonString;
            
            if (sourceData == null) {
                return NodeResult.fail("Source data is null for expression: " + sourceExpression);
            }
            
            // 将源数据转换为 JSON 字符串
            if (sourceData instanceof String) {
                jsonString = (String) sourceData;
            } else {
                // 如果是对象，先序列化为 JSON 字符串
                jsonString = objectMapper.writeValueAsString(sourceData);
            }
            
            // 解析 JSON 字符串
            JsonNode rootNode = objectMapper.readTree(jsonString);
            
            // 获取输出字段配置
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> outputFields = (List<Map<String, Object>>) config.get("outputFields");
            String parseMode = (String) config.getOrDefault("parseMode", "structure");
            String dataStructureId = (String) config.get("dataStructureId");
            if ((outputFields == null || outputFields.isEmpty())
                    && "structure".equals(parseMode)
                    && dataStructureId != null
                    && !dataStructureId.isBlank()) {
                outputFields = buildFieldsFromStructure(dataStructureId);
            }
            
            Map<String, Object> result = new HashMap<>();
            if (outputFields != null && !outputFields.isEmpty()) {
                // 根据配置的字段提取数据
                extractFields(rootNode, outputFields, result, "");
            } else {
                // 如果没有配置输出字段，将整个 JSON 转换为 Map
                result = jsonNodeToMap(rootNode);
            }
            
            log.info("JSON 解析器节点 {} 执行成功, 提取了 {} 个字段", nodeId, result.size());
            
            return NodeResult.success(result);
            
        } catch (JsonProcessingException e) {
            log.error("JSON 解析错误, 节点 {}: {}", nodeId, e.getMessage());
            return NodeResult.fail("JSON parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("执行 JSON 解析器节点 {} 失败: {}", nodeId, e.getMessage());
            return NodeResult.fail("JSON Parser execution failed: " + e.getMessage());
        }
    }

    /**
     * 根据字段配置从 JSON 中提取数据
     */
    private void extractFields(JsonNode rootNode, List<Map<String, Object>> fields, 
                               Map<String, Object> result, String prefix) {
        for (Map<String, Object> field : fields) {
            String path = (String) field.get("path");
            String type = (String) field.get("type");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> children = (List<Map<String, Object>>) field.get("children");
            
            String fullPath = prefix.isEmpty() ? path : prefix + "." + path;
            JsonNode valueNode = getNodeByPath(rootNode, path);
            
            if (valueNode != null && !valueNode.isMissingNode()) {
                Object value = convertJsonNode(valueNode, type);
                result.put(path, value);
                
                // 如果有子字段，递归提取
                if (children != null && !children.isEmpty() && valueNode.isObject()) {
                    Map<String, Object> childResult = new HashMap<>();
                    extractFields(valueNode, children, childResult, fullPath);
                    // 合并子字段到当前字段
                    if (value instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> valueMap = (Map<String, Object>) value;
                        valueMap.putAll(childResult);
                    }
                }
            } else {
                // 字段不存在时设置为 null
                result.put(path, null);
            }
        }
    }

    /**
     * 根据路径获取 JSON 节点
     */
    private JsonNode getNodeByPath(JsonNode root, String path) {
        if (path == null || path.isEmpty() || path.equals("[*]")) {
            return root;
        }
        
        String[] parts = path.split("\\.");
        JsonNode current = root;
        
        for (String part : parts) {
            if (current == null || current.isMissingNode()) {
                return null;
            }
            
            // 处理数组索引 [0], [1] 等
            if (part.matches("\\[\\d+\\]")) {
                int index = Integer.parseInt(part.substring(1, part.length() - 1));
                if (current.isArray() && index < current.size()) {
                    current = current.get(index);
                } else {
                    return null;
                }
            } else if (part.equals("[*]")) {
                // 数组通配符，返回整个数组
                return current;
            } else {
                current = current.get(part);
            }
        }
        
        return current;
    }

    /**
     * 将 JsonNode 转换为对应类型的 Java 对象
     */
    private Object convertJsonNode(JsonNode node, String expectedType) {
        if (node == null || node.isNull()) {
            return null;
        }
        
        if (expectedType == null) {
            return jsonNodeToObject(node);
        }
        
        switch (expectedType) {
            case "string":
                return node.isTextual() ? node.asText() : node.toString();
            case "number":
                if (node.isNumber()) {
                    return node.isFloatingPointNumber() ? node.asDouble() : node.asLong();
                }
                return node.asText();
            case "boolean":
                return node.asBoolean();
            case "array":
                if (node.isArray()) {
                    List<Object> list = new ArrayList<>();
                    for (JsonNode item : node) {
                        list.add(jsonNodeToObject(item));
                    }
                    return list;
                }
                return Collections.singletonList(jsonNodeToObject(node));
            case "object":
            default:
                return jsonNodeToObject(node);
        }
    }

    /**
     * 将 JsonNode 转换为 Java 对象（自动推断类型）
     */
    private Object jsonNodeToObject(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return node.asText();
        }
        if (node.isNumber()) {
            return node.isFloatingPointNumber() ? node.asDouble() : node.asLong();
        }
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        if (node.isArray()) {
            List<Object> list = new ArrayList<>();
            for (JsonNode item : node) {
                list.add(jsonNodeToObject(item));
            }
            return list;
        }
        if (node.isObject()) {
            return jsonNodeToMap(node);
        }
        return node.toString();
    }

    /**
     * 将 JsonNode 转换为 Map
     */
    private Map<String, Object> jsonNodeToMap(JsonNode node) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (node.isObject()) {
            for (Map.Entry<String, JsonNode> entry : node.properties()) {
                map.put(entry.getKey(), jsonNodeToObject(entry.getValue()));
            }
        }
        return map;
    }

    private List<Map<String, Object>> buildFieldsFromStructure(String dataStructureId) {
        try {
            DataStructureResponse structure = dataStructureService.getById(dataStructureId);
            if (structure == null || structure.getFields() == null) {
                return Collections.emptyList();
            }
            return convertFieldDefinitions(structure.getFields());
        } catch (Exception e) {
            log.warn("加载数据结构失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> convertFieldDefinitions(List<FieldDefinitionDTO> fields) {
        if (fields == null || fields.isEmpty()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (FieldDefinitionDTO field : fields) {
            if (field == null || field.getName() == null || field.getName().isBlank()) {
                continue;
            }
            String type = normalizeFieldType(field.getType());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("path", field.getName());
            item.put("type", type);
            if (field.getDescription() != null && !field.getDescription().isBlank()) {
                item.put("description", field.getDescription());
            }
            List<FieldDefinitionDTO> children = null;
            if ("object".equals(type)) {
                children = field.getNestedFields();
            } else if ("array".equals(type)) {
                children = field.getItemFields();
            }
            if (children != null && !children.isEmpty()) {
                item.put("children", convertFieldDefinitions(children));
            }
            result.add(item);
        }
        return result;
    }

    private String normalizeFieldType(String type) {
        if (type == null) {
            return "object";
        }
        switch (type) {
            case "string":
            case "number":
            case "boolean":
            case "object":
            case "array":
                return type;
            default:
                return "object";
        }
    }
}
