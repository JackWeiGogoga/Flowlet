package com.flowlet.engine.handler;

import com.flowlet.config.FlowletProperties;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.engine.code.CodeExecutionRequest;
import com.flowlet.engine.code.CodeExecutionResponse;
import com.flowlet.enums.NodeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 代码执行节点处理器
 * 通过外部执行服务运行 Python 脚本
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CodeNodeHandler implements NodeHandler {

    private final WebClient.Builder webClientBuilder;
    private final FlowletProperties flowletProperties;
    private final ExpressionResolver expressionResolver;

    @Override
    public String getNodeType() {
        return NodeType.CODE.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行代码节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("代码节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String code = asString(config.get("code"));
        if (code == null || code.isBlank()) {
            return NodeResult.fail("代码内容不能为空");
        }

        String language = asString(config.getOrDefault("language", "python"));
        FlowletProperties.CodeExecutorProperties executorProps =
            flowletProperties.getCodeExecutor();

        Integer timeoutMs = asInt(config.get("timeoutMs"), executorProps.getDefaultTimeoutMs());
        Integer memoryMb = asInt(config.get("memoryMb"), executorProps.getDefaultMemoryMb());
        Boolean allowNetwork = asBoolean(config.get("allowNetwork"), executorProps.isDefaultAllowNetwork());

        CodeExecutionRequest request = new CodeExecutionRequest();
        request.setLanguage(language);
        request.setCode(code);
        request.setInputs(resolveInputs(config, context));
        request.setContext(buildContextMeta(context));
        request.setTimeoutMs(timeoutMs);
        request.setMemoryMb(memoryMb);
        request.setAllowNetwork(allowNetwork);

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(executorProps.getBaseUrl())).build();

        CodeExecutionResponse response;
        try {
            response = client.post()
                .uri("/execute")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .bodyValue(request)
                .retrieve()
                .bodyToMono(CodeExecutionResponse.class)
                .block(Duration.ofMillis(executorProps.getRequestTimeoutMs()));
        } catch (Exception ex) {
            log.error("代码节点执行失败: {}", ex.getMessage(), ex);
            return NodeResult.fail("代码执行服务调用失败: " + ex.getMessage());
        }

        if (response == null) {
            return NodeResult.fail("代码执行服务无响应");
        }

        if (!response.isSuccess()) {
            String errorMessage = response.getErrorMessage() != null
                ? response.getErrorMessage()
                : "代码执行失败";
            return NodeResult.fail(errorMessage);
        }

        Map<String, Object> output = new HashMap<>();
        output.put("result", response.getOutput());
        output.put("stdout", response.getStdout());
        output.put("stderr", response.getStderr());
        output.put("durationMs", response.getDurationMs());

        return NodeResult.success(output);
    }

    private Map<String, Object> buildContextMeta(ExecutionContext context) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("executionId", context.getExecutionId());
        meta.put("flowId", context.getFlowId());
        meta.put("currentNodeId", context.getCurrentNodeId());
        return meta;
    }

    private Map<String, Object> resolveInputs(Map<String, Object> config, ExecutionContext context) {
        Object inputsObj = config.get("inputs");
        Map<String, Object> resolved = new HashMap<>();

        if (inputsObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> inputs = (List<Map<String, Object>>) inputsObj;
            for (Map<String, Object> input : inputs) {
                String key = input.get("key") != null ? input.get("key").toString().trim() : null;
                Object valueObj = input.get("value");
                if (key == null || key.isEmpty()) {
                    continue;
                }
                if (valueObj instanceof String) {
                    Object resolvedValue = expressionResolver.resolve((String) valueObj, context);
                    resolved.put(key, resolvedValue);
                } else {
                    resolved.put(key, valueObj);
                }
            }
        }

        if (!resolved.isEmpty()) {
            return resolved;
        }

        return context.getAllData();
    }

    private String asString(Object value) {
        return value instanceof String ? (String) value : null;
    }

    private Integer asInt(Object value, int fallback) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private Boolean asBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        return fallback;
    }
}
