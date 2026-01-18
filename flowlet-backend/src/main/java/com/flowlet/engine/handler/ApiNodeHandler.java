package com.flowlet.engine.handler;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.kafka.DynamicKafkaConsumerFactory;
import com.flowlet.engine.kafka.DynamicKafkaProducerFactory;
import com.flowlet.engine.util.TemplateResolver;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/**
 * API调用节点处理器
 * 支持同步调用和异步回调两种模式
 * - 同步模式：发送请求后立即返回结果
 * - 异步模式：发送请求后暂停流程，等待回调（支持 HTTP 接口回调和 Kafka 消息回调）
 * 
 * 支持在 URL 和请求体中使用 {{变量名}} 格式引用变量
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiNodeHandler implements NodeHandler {

    private final WebClient.Builder webClientBuilder;
    private final DynamicKafkaConsumerFactory kafkaConsumerFactory;
    private final DynamicKafkaProducerFactory kafkaProducerFactory;
    private final ObjectMapper objectMapper;

    @Override
    public String getNodeType() {
        return NodeType.API.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行API节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("API节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String url = (String) config.get("url");
        String method = (String) config.getOrDefault("method", "GET");

        if (url == null || url.isEmpty()) {
            return NodeResult.fail("API URL不能为空");
        }

        // 获取上下文中的所有数据用于变量替换
        Map<String, Object> allData = context.getAllData();
        log.debug("API节点变量替换 - 原始URL: {}, 上下文数据: {}", url, allData);

        // 解析URL中的变量 (支持 {{变量名}} 格式)
        String resolvedUrl = Objects.requireNonNull(TemplateResolver.resolve(url, allData));

        // 解析 URL params 并附加到 URL
        resolvedUrl = appendUrlParams(resolvedUrl, config, allData);
        log.info("API节点 - 解析后URL: {}", resolvedUrl);

        // 获取超时配置
        int timeout = getTimeout(config);

        // 获取回调配置
        Boolean waitForCallback = (Boolean) config.get("waitForCallback");
        if (waitForCallback == null) {
            waitForCallback = false;
        }

        // 生成回调唯一标识
        String callbackKey = Objects.requireNonNull(IdUtil.fastSimpleUUID());

        // 用于记录请求详情
        Map<String, Object> requestDetails = new HashMap<>();
        requestDetails.put("originalUrl", url);
        requestDetails.put("resolvedUrl", resolvedUrl);
        requestDetails.put("method", method);

        try {
            WebClient client = webClientBuilder.build();
            Object response;

            // method 已通过 getOrDefault 确保不为 null，这里验证是否为有效的 HTTP 方法
            HttpMethod httpMethod;
            try {
                httpMethod = HttpMethod.valueOf(Objects.requireNonNull(method.toUpperCase()));
            } catch (IllegalArgumentException e) {
                return NodeResult.fail("不支持的 HTTP 方法: " + method);
            }

            // 构建请求头
            Map<String, String> headers = parseHeaders(config, allData);
            requestDetails.put("headers", headers);
            
            // 应用鉴权配置
            applyAuthConfig(config, headers);

            // 获取回调类型配置
            String callbackType = (String) config.get("callbackType");
            if (callbackType == null) {
                callbackType = "http";
            }

            // 获取 body 类型和内容
            String bodyType = (String) config.getOrDefault("bodyType", "none");
            Object requestBody = buildRequestBody(config, allData, bodyType, waitForCallback, callbackKey, callbackType, context.getExecutionId(), node.getId());
            requestDetails.put("bodyType", bodyType);
            requestDetails.put("body", requestBody);

            // 对于 GET/DELETE 请求，如果需要回调则附加回调参数到 URL
            if (waitForCallback && (httpMethod == HttpMethod.GET || httpMethod == HttpMethod.DELETE)) {
                resolvedUrl = appendCallbackParams(resolvedUrl, callbackKey, callbackType, 
                        Objects.requireNonNull(context.getExecutionId()), Objects.requireNonNull(node.getId()), config);
                requestDetails.put("resolvedUrl", resolvedUrl);
                log.info("GET/DELETE 请求附加回调参数后的 URL: {}", resolvedUrl);
            }

            // 如果是 Kafka 回调且需要等待，注册监听
            if (waitForCallback && "kafka".equals(callbackType)) {
                String callbackTopic = (String) config.get("callbackTopic");
                if (callbackTopic == null || callbackTopic.isEmpty()) {
                    return NodeResult.fail("Kafka 回调模式需要配置回调 Topic");
                }
                String callbackKeyField = (String) config.get("callbackKeyField");
                if (callbackKeyField == null || callbackKeyField.isEmpty()) {
                    callbackKeyField = "callbackKey";
                }

                DynamicKafkaProducerFactory.KafkaConfig kafkaConfig = buildKafkaConfig(config);
                
                log.info("注册 Kafka 回调监听: topic={}, keyField={}", callbackTopic, callbackKeyField);
                kafkaConsumerFactory.registerCallback(
                        callbackKey,
                        kafkaConfig,
                        callbackTopic,
                        callbackKeyField,
                        300000
                );
            }

            // 执行HTTP请求
            response = executeHttpRequest(client, httpMethod, resolvedUrl, headers, requestBody, bodyType, timeout);

            log.info("API调用成功: {} -> {}", resolvedUrl, response);

            // 构建完整的执行过程数据
            Map<String, Object> executionData = new HashMap<>();
            executionData.put("request", requestDetails);
            executionData.put("response", response);
            executionData.put("timestamp", System.currentTimeMillis());

            // 构建输出
            // response 已经包含 statusCode、body、headers
            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = (Map<String, Object>) response;
            
            Map<String, Object> output = new HashMap<>();
            // 将 statusCode、body、headers 放到输出顶层
            output.put("statusCode", responseMap.get("statusCode"));
            output.put("body", responseMap.get("body"));
            output.put("headers", responseMap.get("headers"));
            // 保留其他信息
            output.put("url", resolvedUrl);
            output.put("method", method);
            output.put("request", requestDetails);  // 将请求详情也放入 output
            
            // 仅当开启等待回调时，才输出回调相关信息
            if (waitForCallback) {
                output.put("callbackKey", callbackKey);
                output.put("callbackType", callbackType);
                if ("http".equals(callbackType)) {
                    String httpCallbackUrl = String.format("/api/callback/%s", callbackKey);
                    output.put("httpCallbackUrl", httpCallbackUrl);
                } else if ("kafka".equals(callbackType)) {
                    output.put("callbackTopic", config.get("callbackTopic"));
                    output.put("callbackKeyField", config.getOrDefault("callbackKeyField", "callbackKey"));
                }
                
                // 添加回调信息到执行数据
                executionData.put("callbackInfo", Map.of(
                        "callbackKey", callbackKey,
                        "callbackType", callbackType,
                        "httpCallbackUrl", "http".equals(callbackType) ? String.format("/api/callback/%s", callbackKey) : "",
                        "callbackTopic", "kafka".equals(callbackType) ? config.getOrDefault("callbackTopic", "") : ""
                ));
                
                log.info("API节点等待回调: callbackKey={}, callbackType={}", callbackKey, callbackType);
                return NodeResult.pause(callbackKey, executionData);
            } else {
                // 不需要等待回调，直接返回成功（同时携带执行数据）
                output.put("_executionData", executionData);
                return NodeResult.success(output);
            }

        } catch (Exception e) {
            log.error("API调用失败: {} - {}", resolvedUrl, e.getMessage(), e);
            // 即使失败也记录请求详情
            Map<String, Object> errorData = new HashMap<>();
            errorData.put("request", requestDetails);
            errorData.put("error", e.getMessage());
            errorData.put("timestamp", System.currentTimeMillis());
            return NodeResult.fail("API调用失败: " + e.getMessage());
        }
    }

    /**
     * 解析请求头配置
     * 支持数组格式: [{key: "xxx", value: "yyy"}, ...]
     */
    private Map<String, String> parseHeaders(Map<String, Object> config, Map<String, Object> allData) {
        Map<String, String> headers = new HashMap<>();
        Object headersConfig = config.get("headers");
        
        if (headersConfig == null) {
            return headers;
        }
        
        try {
            if (headersConfig instanceof String) {
                String headersJson = (String) headersConfig;
                if (!headersJson.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsedHeaders = objectMapper.readValue(headersJson, Map.class);
                    parsedHeaders.forEach((k, v) -> {
                        String resolvedValue = TemplateResolver.resolve(String.valueOf(v), allData);
                        headers.put(k, resolvedValue);
                    });
                }
            } else if (headersConfig instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> headerMap = (Map<String, Object>) headersConfig;
                headerMap.forEach((k, v) -> {
                    String resolvedValue = TemplateResolver.resolve(String.valueOf(v), allData);
                    headers.put(k, resolvedValue);
                });
            } else if (headersConfig instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> headerList = (List<Map<String, Object>>) headersConfig;
                for (Map<String, Object> item : headerList) {
                    String key = (String) item.get("key");
                    Object value = item.get("value");
                    if (key != null && !key.isEmpty() && value != null) {
                        String resolvedValue = TemplateResolver.resolve(String.valueOf(value), allData);
                        headers.put(key, resolvedValue);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("解析请求头失败: {}", e.getMessage());
        }
        
        return headers;
    }

    /**
     * 解析 URL 参数并附加到 URL
     * 支持数组格式: [{key: "xxx", value: "yyy"}, ...]
     * 注意：如果参数值包含未解析的变量表达式（如 {{input.xxx}}），则跳过该参数不传递
     */
    @NonNull
    private String appendUrlParams(@NonNull String url, Map<String, Object> config, Map<String, Object> allData) {
        Object paramsConfig = config.get("params");
        if (paramsConfig == null) {
            return url;
        }

        Map<String, String> params = new LinkedHashMap<>();
        
        try {
            if (paramsConfig instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> paramList = (List<Map<String, Object>>) paramsConfig;
                for (Map<String, Object> item : paramList) {
                    String key = (String) item.get("key");
                    Object value = item.get("value");
                    if (key != null && !key.isEmpty() && value != null) {
                        String resolvedValue = TemplateResolver.resolve(String.valueOf(value), allData);
                        // 如果解析后的值仍然包含未解析的变量表达式，则跳过该参数
                        if (TemplateResolver.containsVariables(resolvedValue)) {
                            log.debug("跳过未解析的 URL 参数: {}={}", key, resolvedValue);
                            continue;
                        }
                        params.put(key, resolvedValue);
                    }
                }
            } else if (paramsConfig instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> paramMap = (Map<String, Object>) paramsConfig;
                paramMap.forEach((k, v) -> {
                    String resolvedValue = TemplateResolver.resolve(String.valueOf(v), allData);
                    // 如果解析后的值仍然包含未解析的变量表达式，则跳过该参数
                    if (!TemplateResolver.containsVariables(resolvedValue)) {
                        params.put(k, resolvedValue);
                    } else {
                        log.debug("跳过未解析的 URL 参数: {}={}", k, resolvedValue);
                    }
                });
            }
        } catch (Exception e) {
            log.warn("解析 URL 参数失败: {}", e.getMessage());
            return url;
        }

        if (params.isEmpty()) {
            return url;
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(url);
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = UriUtils.encodeQueryParam(Objects.requireNonNull(entry.getKey()), Objects.requireNonNull(StandardCharsets.UTF_8));
            String value = UriUtils.encodeQueryParam(Objects.requireNonNull(entry.getValue()), Objects.requireNonNull(StandardCharsets.UTF_8));
            builder.queryParam(key, value);
        }

        return builder.build(true).toUriString();
    }

    /**
     * 获取超时配置（毫秒转秒）
     */
    private int getTimeout(Map<String, Object> config) {
        Object timeoutConfig = config.get("timeout");
        if (timeoutConfig instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> timeoutMap = (Map<String, Object>) timeoutConfig;
            // 使用 read 超时作为主要超时
            Object readTimeout = timeoutMap.get("read");
            if (readTimeout instanceof Number) {
                return ((Number) readTimeout).intValue() / 1000;
            }
        } else if (timeoutConfig instanceof Number) {
            return ((Number) timeoutConfig).intValue() / 1000;
        }
        return 30; // 默认 30 秒
    }

    /**
     * 应用鉴权配置
     */
    private void applyAuthConfig(Map<String, Object> config, Map<String, String> headers) {
        Object authConfigObj = config.get("authConfig");
        if (authConfigObj == null) {
            return;
        }

        Map<String, Object> authConfig;
        try {
            if (authConfigObj instanceof String) {
                String authStr = (String) authConfigObj;
                if (authStr.isEmpty()) {
                    return;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(authStr, Map.class);
                authConfig = parsed;
            } else if (authConfigObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) authConfigObj;
                authConfig = map;
            } else {
                return;
            }
        } catch (Exception e) {
            log.warn("解析鉴权配置失败: {}", e.getMessage());
            return;
        }

        String authType = (String) authConfig.get("type");
        if (authType == null || "none".equals(authType)) {
            return;
        }

        switch (authType) {
            case "api-key":
                String apiKey = (String) authConfig.get("apiKey");
                String headerName = (String) authConfig.getOrDefault("headerName", "X-API-Key");
                if (apiKey != null && !apiKey.isEmpty()) {
                    headers.put(headerName, apiKey);
                }
                break;
            case "basic":
                String username = (String) authConfig.get("username");
                String password = (String) authConfig.get("password");
                if (username != null && password != null) {
                    String credentials = Base64.getEncoder().encodeToString((username + ":" + password).getBytes());
                    headers.put("Authorization", "Basic " + credentials);
                }
                break;
            case "bearer":
                String token = (String) authConfig.get("token");
                if (token != null && !token.isEmpty()) {
                    headers.put("Authorization", "Bearer " + token);
                }
                break;
            case "custom":
                String customHeader = (String) authConfig.get("headerName");
                String customValue = (String) authConfig.get("headerValue");
                if (customHeader != null && customValue != null) {
                    headers.put(customHeader, customValue);
                }
                break;
        }
    }

    /**
     * 构建请求体
     * 根据 bodyType 处理不同类型的请求体
     */
    private Object buildRequestBody(
            Map<String, Object> config,
            Map<String, Object> allData,
            String bodyType,
            boolean waitForCallback,
            String callbackKey,
            String callbackType,
            String executionId,
            String nodeId) {
        
        Object body = null;
        
        switch (bodyType) {
            case "none":
                body = new HashMap<>();
                break;
            case "json":
                body = parseJsonBody(config, allData);
                break;
            case "raw":
                body = parseRawBody(config, allData);
                break;
            case "form-data":
                body = parseFormData(config, allData);
                break;
            case "x-www-form-urlencoded":
                body = parseUrlEncodedData(config, allData);
                break;
            default:
                body = new HashMap<>();
        }

        // 如果需要等待回调，注入回调相关信息（仅对 Map 类型的 body）
        if (waitForCallback && body instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> bodyMap = (Map<String, Object>) body;
            bodyMap.put("_callbackKey", callbackKey);
            bodyMap.put("_executionId", executionId);
            bodyMap.put("_nodeId", nodeId);
            bodyMap.put("_callbackType", callbackType);

            if ("http".equals(callbackType)) {
                bodyMap.put("_httpCallbackUrl", String.format("/api/callback/%s", callbackKey));
            } else if ("kafka".equals(callbackType)) {
                bodyMap.put("_callbackTopic", config.get("callbackTopic"));
                bodyMap.put("_callbackKeyField", config.getOrDefault("callbackKeyField", "callbackKey"));
            }
        }

        return body;
    }

    // 宽松模式的 ObjectMapper，允许尾随逗号、注释等
    private static final ObjectMapper lenientMapper = JsonMapper.builder()
            .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
            .enable(JsonReadFeature.ALLOW_JAVA_COMMENTS)
            .enable(JsonReadFeature.ALLOW_SINGLE_QUOTES)
            .enable(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES)
            .build();

    /**
     * 解析 JSON 类型的请求体
     * 使用宽松模式的 ObjectMapper，允许尾随逗号、注释等非标准 JSON 格式
     */
    private Map<String, Object> parseJsonBody(Map<String, Object> config, Map<String, Object> allData) {
        Map<String, Object> body = new HashMap<>();
        String jsonBody = (String) config.get("jsonBody");
        
        if (jsonBody != null && !jsonBody.isEmpty()) {
            String resolvedBody = TemplateResolver.resolve(jsonBody, allData);
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsedBody = lenientMapper.readValue(resolvedBody, Map.class);
                body.putAll(parsedBody);
            } catch (JsonProcessingException e) {
                log.warn("解析 JSON 请求体失败: {}", e.getMessage());
                body.put("_rawContent", resolvedBody);
            }
        }
        
        // 兼容旧的 bodyTemplate 配置
        String bodyTemplate = (String) config.get("bodyTemplate");
        if (body.isEmpty() && bodyTemplate != null && !bodyTemplate.isEmpty()) {
            String resolvedBody = TemplateResolver.resolve(bodyTemplate, allData);
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsedBody = lenientMapper.readValue(resolvedBody, Map.class);
                body.putAll(parsedBody);
            } catch (JsonProcessingException e) {
                log.warn("解析 bodyTemplate 失败: {}", e.getMessage());
            }
        }
        
        return body;
    }

    /**
     * 解析 raw 类型的请求体
     */
    private String parseRawBody(Map<String, Object> config, Map<String, Object> allData) {
        String rawBody = (String) config.get("rawBody");
        if (rawBody != null && !rawBody.isEmpty()) {
            return TemplateResolver.resolve(rawBody, allData);
        }
        return "";
    }

    /**
     * 解析 form-data 类型的请求体
     * 注意：如果参数值包含未解析的变量表达式（如 {{input.xxx}}），则跳过该参数不传递
     */
    private MultiValueMap<String, String> parseFormData(Map<String, Object> config, Map<String, Object> allData) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        Object formDataConfig = config.get("formData");
        
        if (formDataConfig instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) formDataConfig;
            for (Map<String, Object> item : dataList) {
                String key = (String) item.get("key");
                Object value = item.get("value");
                if (key != null && !key.isEmpty() && value != null) {
                    String resolvedValue = TemplateResolver.resolve(String.valueOf(value), allData);
                    // 如果解析后的值仍然包含未解析的变量表达式，则跳过该参数
                    if (TemplateResolver.containsVariables(resolvedValue)) {
                        log.debug("跳过未解析的 form-data 参数: {}={}", key, resolvedValue);
                        continue;
                    }
                    formData.add(key, resolvedValue);
                }
            }
        }
        
        return formData;
    }

    /**
     * 解析 x-www-form-urlencoded 类型的请求体
     * 注意：如果参数值包含未解析的变量表达式（如 {{input.xxx}}），则跳过该参数不传递
     */
    private MultiValueMap<String, String> parseUrlEncodedData(Map<String, Object> config, Map<String, Object> allData) {
        MultiValueMap<String, String> urlEncodedData = new LinkedMultiValueMap<>();
        Object urlEncodedConfig = config.get("urlEncodedData");
        
        if (urlEncodedConfig instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) urlEncodedConfig;
            for (Map<String, Object> item : dataList) {
                String key = (String) item.get("key");
                Object value = item.get("value");
                if (key != null && !key.isEmpty() && value != null) {
                    String resolvedValue = TemplateResolver.resolve(String.valueOf(value), allData);
                    // 如果解析后的值仍然包含未解析的变量表达式，则跳过该参数
                    if (TemplateResolver.containsVariables(resolvedValue)) {
                        log.debug("跳过未解析的 x-www-form-urlencoded 参数: {}={}", key, resolvedValue);
                        continue;
                    }
                    urlEncodedData.add(key, resolvedValue);
                }
            }
        }
        
        return urlEncodedData;
    }

    /**
     * 执行 HTTP 请求
     * 返回包含 statusCode、body、headers 的完整响应信息
     * 
     * @throws IllegalArgumentException 如果 URL 为空
     */
    private Map<String, Object> executeHttpRequest(WebClient client, HttpMethod httpMethod, String url,
                                       Map<String, String> headers, Object body, String bodyType, int timeout) {
        
        // URL 校验（调用方已确保非空，这里是防御性检查）
        if (url == null || url.isEmpty()) {
            throw new IllegalArgumentException("请求 URL 不能为空");
        }
        
        WebClient.RequestHeadersSpec<?> requestSpec;
        
        if (httpMethod == HttpMethod.GET || httpMethod == HttpMethod.DELETE || 
            httpMethod == HttpMethod.HEAD || httpMethod == HttpMethod.OPTIONS) {
            // 无请求体的方法
            WebClient.RequestHeadersSpec<?> spec;
            if (httpMethod == HttpMethod.GET) {
                spec = client.get().uri(url);
            } else if (httpMethod == HttpMethod.DELETE) {
                spec = client.delete().uri(url);
            } else if (httpMethod == HttpMethod.HEAD) {
                spec = client.head().uri(url);
            } else {
                spec = client.options().uri(url);
            }
            
            // 添加请求头（跳过空的 key 或 value）
            for (Map.Entry<String, String> header : headers.entrySet()) {
                String key = header.getKey();
                String value = header.getValue();
                if (key != null && !key.isEmpty() && value != null) {
                    spec = spec.header(key, value);
                }
            }
            
            requestSpec = spec;
        } else {
            // 有请求体的方法 (POST/PUT/PATCH)
            WebClient.RequestBodySpec spec;
            if (httpMethod == HttpMethod.POST) {
                spec = client.post().uri(url);
            } else if (httpMethod == HttpMethod.PUT) {
                spec = client.put().uri(url);
            } else {
                spec = client.patch().uri(url);
            }
            
            // 添加请求头（跳过空的 key 或 value）
            for (Map.Entry<String, String> header : headers.entrySet()) {
                String key = header.getKey();
                String value = header.getValue();
                if (key != null && !key.isEmpty() && value != null) {
                    spec = spec.header(key, value);
                }
            }
            
            // 根据 body 类型设置 Content-Type 和请求体
            // 注意：MediaType.*_VALUE 是常量，永不为 null，使用 requireNonNull 是为了满足编译器检查
            Object requestBody = body != null ? body : "";
            switch (bodyType) {
                case "json":
                    if (!headers.containsKey("Content-Type")) {
                        spec = spec.header("Content-Type", MediaType.APPLICATION_JSON_VALUE);
                    }
                    requestSpec = spec.bodyValue(requestBody);
                    break;
                case "raw":
                    if (!headers.containsKey("Content-Type")) {
                        spec = spec.header("Content-Type", MediaType.TEXT_PLAIN_VALUE);
                    }
                    requestSpec = spec.bodyValue(requestBody);
                    break;
                case "form-data":
                    if (!headers.containsKey("Content-Type")) {
                        spec = spec.header("Content-Type", MediaType.MULTIPART_FORM_DATA_VALUE);
                    }
                    if (body instanceof MultiValueMap) {
                        @SuppressWarnings("unchecked")
                        MultiValueMap<String, String> formData = (MultiValueMap<String, String>) body;
                        requestSpec = spec.body(BodyInserters.fromMultipartData(formData));
                    } else {
                        log.warn("form-data 类型的 body 应为 MultiValueMap，实际类型: {}", 
                                body != null ? body.getClass().getName() : "null");
                        requestSpec = spec.bodyValue(requestBody);
                    }
                    break;
                case "x-www-form-urlencoded":
                    if (!headers.containsKey("Content-Type")) {
                        spec = spec.header("Content-Type", MediaType.APPLICATION_FORM_URLENCODED_VALUE);
                    }
                    if (body instanceof MultiValueMap) {
                        @SuppressWarnings("unchecked")
                        MultiValueMap<String, String> urlEncodedData = (MultiValueMap<String, String>) body;
                        requestSpec = spec.body(BodyInserters.fromFormData(urlEncodedData));
                    } else {
                        log.warn("x-www-form-urlencoded 类型的 body 应为 MultiValueMap，实际类型: {}", 
                                body != null ? body.getClass().getName() : "null");
                        requestSpec = spec.bodyValue(requestBody);
                    }
                    break;
                default:
                    requestSpec = spec.bodyValue(requestBody);
            }
        }
        
        // 使用 exchangeToMono 获取完整的响应信息（状态码、响应头、响应体）
        return requestSpec.exchangeToMono(response -> {
            int statusCode = response.statusCode().value();
            
            // 转换响应头为简单 Map
            Map<String, String> responseHeaders = new HashMap<>();
            response.headers().asHttpHeaders().forEach((key, values) -> {
                if (values != null && !values.isEmpty()) {
                    responseHeaders.put(key, String.join(", ", values));
                }
            });
            
            // 读取响应体
            return response.bodyToMono(Object.class)
                    .defaultIfEmpty(Collections.emptyMap())
                    .map(responseBody -> {
                        Map<String, Object> result = new HashMap<>();
                        result.put("statusCode", statusCode);
                        result.put("headers", responseHeaders);
                        result.put("body", responseBody);
                        return result;
                    });
        }).timeout(Duration.ofSeconds(timeout)).block();
    }

    /**
     * 为 GET/DELETE 请求附加回调参数到 URL
     */
    private String appendCallbackParams(@NonNull String url, @NonNull String callbackKey, @NonNull String callbackType,
                                        @NonNull String executionId, @NonNull String nodeId, Map<String, Object> config) {
        Charset charset = Objects.requireNonNull(StandardCharsets.UTF_8);
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(url)
                .queryParam("_callbackKey", UriUtils.encodeQueryParam(callbackKey, charset))
                .queryParam("_executionId", UriUtils.encodeQueryParam(executionId, charset))
                .queryParam("_nodeId", UriUtils.encodeQueryParam(nodeId, charset))
                .queryParam("_callbackType", UriUtils.encodeQueryParam(callbackType, charset));

        if ("http".equals(callbackType)) {
            String httpCallbackUrl = Objects.requireNonNull(String.format("/api/callback/%s", callbackKey));
            builder.queryParam(
                    "_httpCallbackUrl",
                    UriUtils.encodeQueryParam(httpCallbackUrl, charset)
            );
        } else if ("kafka".equals(callbackType)) {
            String callbackTopic = (String) config.get("callbackTopic");
            String callbackKeyField = Objects.requireNonNull((String) config.getOrDefault("callbackKeyField", "callbackKey"));
            if (callbackTopic != null) {
                builder.queryParam(
                        "_callbackTopic",
                        UriUtils.encodeQueryParam(callbackTopic, charset)
                );
            }
            builder.queryParam(
                    "_callbackKeyField",
                    UriUtils.encodeQueryParam(callbackKeyField, charset)
            );
        }

        return builder.build(true).toUriString();
    }

    /**
     * 构建 Kafka 配置
     */
    private DynamicKafkaProducerFactory.KafkaConfig buildKafkaConfig(Map<String, Object> config) {
        Map<String, Object> kafkaConfigMap = new HashMap<>();
        
        // 获取 Kafka Broker 配置
        String kafkaBrokers = (String) config.get("kafkaBrokers");
        if (kafkaBrokers == null || kafkaBrokers.isEmpty()) {
            kafkaBrokers = "localhost:9092";  // 默认值
        }
        kafkaConfigMap.put("brokers", kafkaBrokers);

        // 获取认证配置
        String kafkaAuthType = (String) config.get("kafkaAuthType");
        if (kafkaAuthType != null && !"none".equals(kafkaAuthType)) {
            kafkaConfigMap.put("authType", kafkaAuthType);
            kafkaConfigMap.put("username", config.get("kafkaUsername"));
            kafkaConfigMap.put("password", config.get("kafkaPassword"));
        }

        return kafkaProducerFactory.createConfig(kafkaConfigMap);
    }
}
