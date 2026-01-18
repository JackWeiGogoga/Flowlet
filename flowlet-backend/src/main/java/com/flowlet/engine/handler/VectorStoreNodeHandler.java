package com.flowlet.engine.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.config.FlowletProperties;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.util.TemplateResolver;
import com.flowlet.entity.VectorStoreProvider;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.VectorStoreProviderMapper;
import com.flowlet.util.ModelHubCrypto;
import com.flowlet.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.*;

/**
 * 向量存储节点处理器
 * 支持 Milvus / Qdrant 的 upsert、delete、search 操作
 * 
 * 注意：本节点不进行向量化操作，用户需要在前置节点完成向量化，然后通过变量引用传入。
 * 
 * 节点配置说明：
 * - providerId: 向量存储提供商ID（用户配置）
 * - operation: 操作类型 (upsert/delete/search)
 * - collection: 集合名称
 * 
 * Upsert 操作配置：
 * - vectorSource: 向量来源表达式，如 {{nodes.embedding.output.vectors}}
 * - contentSource: 内容来源表达式，如 {{nodes.splitter.output.chunks}}
 * - idSource: ID 来源表达式（可选），如 {{nodes.loader.output.ids}}
 * - metadataSource: 元数据来源表达式（可选）
 * 
 * Delete 操作配置：
 * - ids: ID 列表表达式
 * 
 * Search 操作配置：
 * - queryVector: 查询向量表达式（已向量化）
 * - topK: 返回结果数量
 * - filter: 过滤条件
 * - scoreThreshold: 相似度阈值（可选，仅返回大于阈值的结果）
 * - excludeId: 排除内容ID（可选，过滤掉自身）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorStoreNodeHandler implements NodeHandler {

    private static final int DEFAULT_TOP_K = 5;

    private final WebClient.Builder webClientBuilder;
    private final FlowletProperties flowletProperties;
    private final VectorStoreProviderMapper vectorStoreProviderMapper;
    private final ModelHubCrypto modelHubCrypto;
    private final ObjectMapper objectMapper;

    @Override
    public String getNodeType() {
        return NodeType.VECTOR_STORE.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("向量存储节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String providerId = getString(config, "providerId", null);
        String operation = getString(config, "operation", "search");
        String collection = getString(config, "collection", null);

        // 验证必填字段
        if (providerId == null || providerId.isBlank()) {
            return NodeResult.fail("未选择向量存储提供商");
        }
        if (collection == null || collection.isBlank()) {
            return NodeResult.fail("未指定集合名称");
        }

        // 获取提供商配置
        VectorStoreProvider provider = resolveProvider(providerId);
        if (provider == null) {
            return NodeResult.fail("未找到向量存储提供方配置");
        }
        if (!Boolean.TRUE.equals(provider.getEnabled())) {
            return NodeResult.fail("向量存储提供方已停用");
        }

        // 解析 collection（支持模板表达式）
        Map<String, Object> allData = context.getAllData();
        collection = TemplateResolver.resolve(collection, allData);

        // 构建请求详情（用于调试）
        Map<String, Object> requestDetails = new HashMap<>();
        requestDetails.put("providerId", providerId);
        requestDetails.put("providerKey", provider.getProviderKey());
        requestDetails.put("providerName", provider.getName());
        requestDetails.put("operation", operation);
        requestDetails.put("collection", collection);

        try {
            Map<String, Object> result;
            switch (operation.toLowerCase(Locale.ROOT)) {
                case "upsert":
                    result = executeUpsert(provider, collection, config, context, requestDetails);
                    break;
                case "delete":
                    result = executeDelete(provider, collection, config, context, requestDetails);
                    break;
                case "search":
                default:
                    result = executeSearch(provider, collection, config, context, requestDetails);
                    break;
            }
            return NodeResult.success(result);
        } catch (WebClientResponseException ex) {
            log.error("向量存储调用失败: {}", ex.getMessage(), ex);
            return NodeResult.fail("向量存储调用失败: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("向量存储调用失败: {}", ex.getMessage(), ex);
            return NodeResult.fail("向量存储调用失败: " + ex.getMessage());
        }
    }

    /**
     * 执行 upsert 操作（单文档模式）
     * 
     * 配置参数：
     * - vectorSource: 向量来源（必填）- 单个向量数组
     * - contentSource: 内容来源（可选）- 单个字符串
     * - idSource: ID 来源（可选）- 单个字符串，不填则自动生成 UUID
     * - metadataSource: 元数据来源（可选）- 单个 JSON 对象
     * 
     * 后端自动将单文档包装成数组发送给 Python 服务
     */
    private Map<String, Object> executeUpsert(
            VectorStoreProvider provider,
            String collection,
            Map<String, Object> config,
            ExecutionContext context,
            Map<String, Object> requestDetails
    ) throws Exception {
        Map<String, Object> allData = context.getAllData();

        // 1. 解析向量（必填）
        String vectorSourceExpr = getString(config, "vectorSource", null);
        if (vectorSourceExpr == null || vectorSourceExpr.isBlank()) {
            throw new IllegalArgumentException("upsert 操作需要指定向量来源 (vectorSource)");
        }
        List<Double> vector = resolveVector(vectorSourceExpr, allData);
        if (vector == null || vector.isEmpty()) {
            throw new IllegalArgumentException("向量为空");
        }

        // 2. 解析内容（可选）
        String contentSourceExpr = getString(config, "contentSource", null);
        String content = "";
        if (contentSourceExpr != null && !contentSourceExpr.isBlank()) {
            content = resolveString(contentSourceExpr, allData);
        }

        // 3. 解析 ID（可选，自动生成）
        String idSourceExpr = getString(config, "idSource", null);
        String docId;
        if (idSourceExpr != null && !idSourceExpr.isBlank()) {
            docId = resolveString(idSourceExpr, allData);
            if (docId == null || docId.isBlank()) {
                docId = UUID.randomUUID().toString();
            }
        } else {
            docId = UUID.randomUUID().toString();
        }

        // 4. 解析元数据（可选）
        String metadataSourceExpr = getString(config, "metadataSource", null);
        Map<String, Object> metadata = Map.of();
        if (metadataSourceExpr != null && !metadataSourceExpr.isBlank()) {
            metadata = resolveMap(metadataSourceExpr, allData);
        }

        // 5. 构建单个文档
        Map<String, Object> doc = new HashMap<>();
        doc.put("id", docId);
        doc.put("vector", vector);
        doc.put("content", content);
        doc.put("metadata", metadata);

        // 包装成数组发送给 Python 服务
        List<Map<String, Object>> documents = List.of(doc);

        requestDetails.put("documentsCount", 1);
        requestDetails.put("vectorDimension", vector.size());

        // 构建请求
        Map<String, Object> request = new HashMap<>();
        request.put("provider", buildProviderConfig(provider));
        request.put("collection", collection);
        request.put("documents", documents);

        // 调用向量存储服务
        Map<String, Object> response = callVectorStoreService("/vector-stores/upsert", request);

        Map<String, Object> output = new HashMap<>();
        output.put("operation", "upsert");
        output.put("count", 1);
        output.put("id", docId);
        output.put("ids", List.of(docId));
        output.put("success", true);
        output.put("raw", response);
        output.put("request", requestDetails);

        return output;
    }

    /**
     * 执行 delete 操作
     */
    private Map<String, Object> executeDelete(
            VectorStoreProvider provider,
            String collection,
            Map<String, Object> config,
            ExecutionContext context,
            Map<String, Object> requestDetails
    ) throws Exception {
        String idsExpr = getString(config, "ids", null);
        if (idsExpr == null || idsExpr.isBlank()) {
            throw new IllegalArgumentException("delete 操作需要指定 ids");
        }

        // 解析 ID 列表
        Map<String, Object> allData = context.getAllData();
        List<String> ids = resolveStringList(idsExpr, allData);
        
        if (ids.isEmpty()) {
            throw new IllegalArgumentException("ids 列表为空");
        }
        requestDetails.put("idsCount", ids.size());

        // 构建请求
        Map<String, Object> request = new HashMap<>();
        request.put("provider", buildProviderConfig(provider));
        request.put("collection", collection);
        request.put("ids", ids);

        // 调用向量存储服务
        Map<String, Object> response = callVectorStoreService("/vector-stores/delete", request);

        Map<String, Object> output = new HashMap<>();
        output.put("operation", "delete");
        output.put("count", ids.size());
        output.put("success", true);
        output.put("raw", response);
        output.put("request", requestDetails);

        return output;
    }

    /**
     * 执行 search 操作
     */
    private Map<String, Object> executeSearch(
            VectorStoreProvider provider,
            String collection,
            Map<String, Object> config,
            ExecutionContext context,
            Map<String, Object> requestDetails
    ) throws Exception {
        Map<String, Object> allData = context.getAllData();
        
        // 获取查询向量（必须已经向量化）
        String queryVectorExpr = getString(config, "queryVector", null);
        if (queryVectorExpr == null || queryVectorExpr.isBlank()) {
            throw new IllegalArgumentException("search 操作需要指定 queryVector（已向量化的查询向量）");
        }
        
        List<Double> queryVector = resolveVector(queryVectorExpr, allData);
        if (queryVector == null || queryVector.isEmpty()) {
            throw new IllegalArgumentException("查询向量为空，请确保前置节点已完成向量化");
        }

        Integer topK = getInteger(config.get("topK"));
        if (topK == null || topK <= 0) {
            topK = DEFAULT_TOP_K;
        }

        // 解析过滤条件
        Map<String, Object> filter = null;
        String filterExpr = getString(config, "filter", null);
        if (filterExpr != null && !filterExpr.isBlank()) {
            String resolvedFilter = TemplateResolver.resolve(filterExpr, allData);
            filter = parseFilterExpression(resolvedFilter);
        }

        Double scoreThreshold = resolveScoreThreshold(
            getString(config, "scoreThreshold", null),
            allData
        );
        String excludeId = resolveString(getString(config, "excludeId", null), allData);
        if (excludeId != null) {
            excludeId = excludeId.trim();
            if (excludeId.isEmpty()) {
                excludeId = null;
            }
        }

        requestDetails.put("topK", topK);
        requestDetails.put("hasFilter", filter != null);
        requestDetails.put("vectorDimension", queryVector.size());
        if (scoreThreshold != null) {
            requestDetails.put("scoreThreshold", scoreThreshold);
        }
        if (excludeId != null) {
            requestDetails.put("excludeId", excludeId);
        }

        // 构建请求
        Map<String, Object> request = new HashMap<>();
        request.put("provider", buildProviderConfig(provider));
        request.put("collection", collection);
        request.put("query_vector", queryVector);
        request.put("k", topK);
        if (filter != null) {
            request.put("filter", filter);
        }

        // 调用向量存储服务
        Map<String, Object> response = callVectorStoreService("/vector-stores/search", request);

        Map<String, Object> output = new HashMap<>();
        output.put("operation", "search");
        if (scoreThreshold != null) {
            List<Map<String, Object>> filteredMatches =
                filterMatchesByScore(response.get("matches"), scoreThreshold);
            if (excludeId != null) {
                filteredMatches = filterMatchesById(filteredMatches, excludeId);
            }
            output.put("matches", filteredMatches);
            output.put("matchedIds", extractMatchIds(filteredMatches));
        } else if (excludeId != null) {
            output.put("matches", filterMatchesById(response.get("matches"), excludeId));
        } else {
            output.put("matches", response.get("matches"));
        }
        output.put("success", true);
        output.put("raw", response);
        output.put("request", requestDetails);

        return output;
    }

    // =========================================================================
    // 单值解析方法（单文档模式使用）
    // =========================================================================

    /**
     * 解析单个字符串
     * 
     * 支持两种输入格式：
     * 1. 常量值：my-doc-001
     * 2. 变量引用：{{nodes.xxx.output.text}}
     */
    private String resolveString(String expr, Map<String, Object> allData) {
        if (expr == null || expr.isBlank()) {
            return "";
        }
        
        // 模板解析（处理 {{变量}} 和常量）
        String resolved = TemplateResolver.resolve(expr, allData);
        
        // 如果解析后是 JSON 字符串（带引号），尝试去掉引号
        if (resolved.startsWith("\"") && resolved.endsWith("\"")) {
            try {
                return objectMapper.readValue(resolved, String.class);
            } catch (JsonProcessingException ignored) {
            }
        }
        
        return resolved;
    }

    /**
     * 解析单个 Map（JSON 对象）
     * 
     * 支持两种输入格式：
     * 1. JSON 对象：{"source": "demo", "category": "tech"}
     * 2. 变量引用：{{nodes.xxx.output.metadata}}
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> resolveMap(String expr, Map<String, Object> allData) {
        if (expr == null || expr.isBlank()) {
            return Map.of();
        }
        
        // 模板解析
        String resolved = TemplateResolver.resolve(expr, allData);
        
        // 尝试解析为 JSON 对象
        try {
            Object parsed = objectMapper.readValue(resolved, Object.class);
            if (parsed instanceof Map) {
                return (Map<String, Object>) parsed;
            }
        } catch (JsonProcessingException ignored) {
        }
        
        // 尝试从上下文中获取
        String path = extractVariablePath(expr);
        if (path != null) {
            Object value = getNestedValue(allData, path);
            if (value instanceof Map) {
                return (Map<String, Object>) value;
            }
        }
        
        return Map.of();
    }

    /**
     * 解析单个向量
     */
    private List<Double> resolveVector(String expr, Map<String, Object> allData) {
        List<Double> result = new ArrayList<>();
        
        // 先尝试模板解析
        String resolved = TemplateResolver.resolve(expr, allData);
        
        // 尝试解析为 JSON
        try {
            Object parsed = objectMapper.readValue(resolved, Object.class);
            if (parsed instanceof List) {
                for (Object item : (List<?>) parsed) {
                    if (item instanceof Number) {
                        result.add(((Number) item).doubleValue());
                    }
                }
                if (!result.isEmpty()) {
                    return result;
                }
            }
        } catch (JsonProcessingException ignored) {
        }

        // 尝试从上下文中获取
        String path = extractVariablePath(expr);
        if (path != null) {
            Object value = getNestedValue(allData, path);
            if (value instanceof List) {
                for (Object item : (List<?>) value) {
                    if (item instanceof Number) {
                        result.add(((Number) item).doubleValue());
                    }
                }
            }
        }

        return result;
    }

    /**
     * 解析字符串列表
     * 
     * 支持三种输入格式：
     * 1. JSON 数组：["id1", "id2", "id3"]
     * 2. 变量引用：{{nodes.xxx.output.ids}}
     * 3. 单个常量值：my-doc-001 → 自动包装成 ["my-doc-001"]
     */
    private List<String> resolveStringList(String expr, Map<String, Object> allData) {
        List<String> result = new ArrayList<>();
        
        // 先尝试模板解析
        String resolved = TemplateResolver.resolve(expr, allData);
        
        // 尝试解析为 JSON 数组
        try {
            Object parsed = objectMapper.readValue(resolved, Object.class);
            if (parsed instanceof List) {
                for (Object item : (List<?>) parsed) {
                    if (item != null) {
                        result.add(item.toString());
                    }
                }
                if (!result.isEmpty()) {
                    return result;
                }
            }
            // 如果解析成功但不是数组（比如是字符串），将其作为单个值
            if (parsed instanceof String) {
                String value = (String) parsed;
                if (!value.isBlank()) {
                    result.add(value);
                    return result;
                }
            }
        } catch (JsonProcessingException ignored) {
            // 不是有效的 JSON，继续尝试其他方式
        }

        // 尝试从上下文中获取（{{变量}}格式）
        String path = extractVariablePath(expr);
        if (path != null) {
            Object value = getNestedValue(allData, path);
            if (value instanceof List) {
                for (Object item : (List<?>) value) {
                    if (item != null) {
                        result.add(item.toString());
                    }
                }
                if (!result.isEmpty()) {
                    return result;
                }
            }
            // 如果变量值是单个字符串
            if (value instanceof String) {
                String strValue = (String) value;
                if (!strValue.isBlank()) {
                    result.add(strValue);
                    return result;
                }
            }
        }
        
        // 最后，如果 resolved 是一个非空的普通字符串（常量值），将其作为单个元素
        // 例如用户输入 "my-doc-001" 作为 ID
        if (!resolved.isBlank() && !resolved.startsWith("[") && !resolved.startsWith("{{")) {
            result.add(resolved);
            log.debug("将常量字符串作为单个元素处理: {}", resolved);
        }

        return result;
    }

    /**
     * 调用向量存储服务
     */
    private Map<String, Object> callVectorStoreService(@NonNull String path, @NonNull Map<String, Object> request) {
        String baseUrl = flowletProperties.getVectorStore().getBaseUrl();
        int timeoutMs = flowletProperties.getVectorStore().getRequestTimeoutMs();

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(baseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = new ParameterizedTypeReference<>() {};

        Map<String, Object> response = client.post()
                .uri(path)
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .block(Duration.ofMillis(timeoutMs));

        if (response == null) {
            throw new IllegalStateException("向量存储服务响应为空");
        }

        return response;
    }

    /**
     * 构建提供商配置
     */
    private Map<String, Object> buildProviderConfig(VectorStoreProvider provider) {
        Map<String, Object> config = new HashMap<>();
        config.put("type", provider.getProviderKey());
        config.put("baseUrl", provider.getBaseUrl());
        
        // 解密 API Key
        if (provider.getApiKeyEncrypted() != null && !provider.getApiKeyEncrypted().isBlank()) {
            String apiKey = modelHubCrypto.decrypt(provider.getApiKeyEncrypted());
            if (apiKey != null && !apiKey.isBlank()) {
                config.put("apiKey", apiKey);
            }
        }

        // 解析扩展配置
        if (provider.getConfigJson() != null && !provider.getConfigJson().isBlank()) {
            try {
                Map<String, Object> extConfig = objectMapper.readValue(
                        provider.getConfigJson(),
                        new TypeReference<Map<String, Object>>() {}
                );
                if (extConfig.get("database") != null) {
                    config.put("database", extConfig.get("database"));
                }
                if (extConfig.get("grpcUrl") != null) {
                    config.put("grpcUrl", extConfig.get("grpcUrl"));
                }
                if (extConfig.get("preferGrpc") != null) {
                    config.put("preferGrpc", extConfig.get("preferGrpc"));
                }
            } catch (JsonProcessingException ex) {
                log.warn("解析向量存储扩展配置失败", ex);
            }
        }

        return config;
    }

    /**
     * 解析提供商
     */
    private VectorStoreProvider resolveProvider(String providerId) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        VectorStoreProvider provider = vectorStoreProviderMapper.selectById(providerId);
        if (provider == null || !tenantId.equals(provider.getTenantId())) {
            return null;
        }
        return provider;
    }

    /**
     * 解析过滤表达式
     */
    private Map<String, Object> parseFilterExpression(String resolved) {
        if (resolved == null || resolved.isBlank()) {
            return null;
        }
        try {
            Object parsed = objectMapper.readValue(resolved, Object.class);
            if (parsed instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> filter = (Map<String, Object>) parsed;
                return filter;
            }
        } catch (JsonProcessingException ignored) {
        }
        return null;
    }

    /**
     * 提取变量路径
     */
    private String extractVariablePath(String expr) {
        if (expr == null) return null;
        // 匹配 {{xxx}} 格式
        if (expr.startsWith("{{") && expr.endsWith("}}")) {
            return expr.substring(2, expr.length() - 2).trim();
        }
        return null;
    }

    /**
     * 获取嵌套值
     */
    private Object getNestedValue(Map<String, Object> data, String path) {
        String[] parts = path.split("\\.");
        Object current = data;
        for (String part : parts) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(part);
            } else {
                return null;
            }
        }
        return current;
    }

    private Double resolveScoreThreshold(String expr, Map<String, Object> allData) {
        if (expr == null || expr.isBlank()) {
            return null;
        }
        String resolved = TemplateResolver.resolve(expr, allData);
        if (resolved == null || resolved.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(resolved, Double.class);
        } catch (JsonProcessingException ex) {
            String trimmed = resolved.trim();
            if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() > 1) {
                trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
            }
            return getDouble(trimmed);
        }
    }

    private List<Map<String, Object>> filterMatchesByScore(Object matches, double threshold) {
        if (!(matches instanceof List)) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Object item : (List<?>) matches) {
            if (!(item instanceof Map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> match = (Map<String, Object>) item;
            Double score = getMatchScore(match);
            if (score != null && score >= threshold) {
                filtered.add(match);
            }
        }
        return filtered;
    }

    private List<Map<String, Object>> filterMatchesById(Object matches, String excludeId) {
        if (!(matches instanceof List)) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Object item : (List<?>) matches) {
            if (!(item instanceof Map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> match = (Map<String, Object>) item;
            Object id = match.get("id");
            if (id != null && excludeId.equals(id.toString())) {
                continue;
            }
            filtered.add(match);
        }
        return filtered;
    }

    private Double getMatchScore(Map<String, Object> match) {
        if (match.containsKey("score")) {
            return getDouble(match.get("score"));
        }
        if (match.containsKey("similarity")) {
            return getDouble(match.get("similarity"));
        }
        if (match.containsKey("distance")) {
            Double distance = getDouble(match.get("distance"));
            if (distance == null) {
                return null;
            }
            return distance <= 1 ? 1 - distance : -distance;
        }
        return null;
    }

    private List<String> extractMatchIds(List<Map<String, Object>> matches) {
        List<String> ids = new ArrayList<>();
        for (Map<String, Object> match : matches) {
            Object id = match.get("id");
            if (id != null) {
                ids.add(id.toString());
            }
        }
        return ids;
    }

    // =========================================================================
    // 工具方法
    // =========================================================================

    private String getString(Map<String, Object> config, String key, String defaultValue) {
        Object value = config.get(key);
        if (value == null) {
            return defaultValue;
        }
        String text = Objects.toString(value, "").trim();
        return text.isEmpty() ? defaultValue : text;
    }

    private Integer getInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double getDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
