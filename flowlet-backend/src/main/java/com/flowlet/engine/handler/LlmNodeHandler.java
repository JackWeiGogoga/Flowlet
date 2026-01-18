package com.flowlet.engine.handler;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.util.TemplateResolver;
import com.flowlet.entity.ModelProvider;
import com.flowlet.enums.ModelProviderType;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.ModelProviderMapper;
import com.flowlet.util.ModelHubCrypto;
import com.flowlet.util.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 大模型调用节点处理器
 * 支持 OpenAI 兼容、Anthropic 与 Gemini 的基础调用
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LlmNodeHandler implements NodeHandler {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(60);
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final Pattern CODE_FENCE_PATTERN =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", Pattern.CASE_INSENSITIVE);
    private static final ObjectMapper lenientMapper = JsonMapper.builder()
            .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
            .enable(JsonReadFeature.ALLOW_JAVA_COMMENTS)
            .enable(JsonReadFeature.ALLOW_SINGLE_QUOTES)
            .enable(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES)
            .build();

    private final WebClient.Builder webClientBuilder;
    private final ModelProviderMapper modelProviderMapper;
    private final ModelHubCrypto modelHubCrypto;

    @Override
    public String getNodeType() {
        return NodeType.LLM.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("LLM节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String providerType = getString(config, "providerType", ModelProviderType.STANDARD.name())
                .toUpperCase(Locale.ROOT);
        String providerKey = getString(config, "providerKey", null);
        String providerId = getString(config, "providerId", null);

        ModelProvider provider = resolveProvider(providerType, providerKey, providerId);
        if (provider == null) {
            return NodeResult.fail("未找到模型提供方配置");
        }
        if (!Boolean.TRUE.equals(provider.getEnabled())) {
            return NodeResult.fail("模型提供方已停用");
        }

        String apiKey = modelHubCrypto.decrypt(provider.getApiKeyEncrypted());
        if (apiKey == null || apiKey.isBlank()) {
            return NodeResult.fail("模型提供方未配置 API Key");
        }

        String model = getString(config, "model", null);
        if (model == null || model.isBlank()) {
            model = provider.getDefaultModel();
        }
        if (model == null || model.isBlank()) {
            return NodeResult.fail("模型不能为空");
        }

        Map<String, Object> allData = context.getAllData();
        String systemPrompt = resolvePrompt(config, "systemPrompt", allData);
        List<LlmMessage> messages = resolveMessages(config, allData);
        if (messages.isEmpty()) {
            return NodeResult.fail("用户提示词不能为空");
        }

        Double temperature = getDouble(config.get("temperature"));
        Double topP = getDouble(config.get("topP"));
        Integer maxTokens = getInteger(config.get("maxTokens"));
        Integer timeoutMs = getInteger(config.get("timeoutMs"));
        Duration timeout = timeoutMs != null ? Duration.ofMillis(timeoutMs) : DEFAULT_TIMEOUT;

        Map<String, Object> requestDetails = new HashMap<>();
        requestDetails.put("providerType", providerType);
        requestDetails.put("providerKey", provider.getProviderKey());
        requestDetails.put("providerId", provider.getId());
        requestDetails.put("model", model);
        requestDetails.put("baseUrl", provider.getBaseUrl());
        requestDetails.put("messages", toMessageDetails(messages));

        try {
            String providerKeyNormalized = provider.getProviderKey() == null
                    ? ""
                    : provider.getProviderKey().toLowerCase(Locale.ROOT);
            List<String> textPrompts = toUserPrompts(messages);

            Map<String, Object> response;
            if (ModelProviderType.STANDARD.name().equals(providerType)
                    && "anthropic".equals(providerKeyNormalized)) {
                if (textPrompts.isEmpty()) {
                    return NodeResult.fail("用户提示词不能为空");
                }
                response = executeAnthropic(provider, apiKey, model, systemPrompt,
                        textPrompts,
                        temperature, topP, maxTokens, requestDetails, timeout);
            } else if (ModelProviderType.STANDARD.name().equals(providerType)
                    && "gemini".equals(providerKeyNormalized)) {
                if (textPrompts.isEmpty()) {
                    return NodeResult.fail("用户提示词不能为空");
                }
                response = executeGemini(provider, apiKey, model, systemPrompt,
                        textPrompts,
                        temperature, topP, maxTokens, requestDetails, timeout);
            } else {
                response = executeOpenAiCompatible(provider, apiKey, model, systemPrompt, messages,
                        temperature, topP, maxTokens, requestDetails, timeout);
            }

        String text = extractText(response, providerType, providerKeyNormalized);
        if (text == null) {
            return NodeResult.fail("模型返回为空");
        }

        Map<String, Object> output = new HashMap<>();
        output.put("text", text);
        output.put("model", model);
        output.put("usage", extractUsage(response, providerType));
        output.put("request", requestDetails);
        output.put("response", response);
        output.put("provider", provider.getName() != null ? provider.getName() : provider.getProviderKey());

        boolean outputJsonEnabled = getBoolean(config.get("outputJsonEnabled"));
        List<String> jsonFields = getStringList(config.get("outputJsonFields"));
        if (outputJsonEnabled && !jsonFields.isEmpty()) {
            Map<String, Object> parsed = parseJsonOutput(text);
            if (parsed != null && !parsed.isEmpty()) {
                for (String field : jsonFields) {
                    if (field == null || field.isBlank()) {
                        continue;
                    }
                    output.put(field.trim(), parsed.get(field.trim()));
                }
            }
        }
        return NodeResult.success(output);
    } catch (WebClientResponseException ex) {
        log.error("LLM 调用失败: {}", ex.getMessage(), ex);
        return NodeResult.fail("LLM 调用失败: " + ex.getStatusCode());
        } catch (Exception ex) {
            log.error("LLM 调用失败: {}", ex.getMessage(), ex);
            return NodeResult.fail("LLM 调用失败: " + ex.getMessage());
        }
    }

    private ModelProvider resolveProvider(String providerType, String providerKey, String providerId) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (ModelProviderType.CUSTOM.name().equals(providerType)) {
            if (providerId == null || providerId.isBlank()) {
                return null;
            }
            ModelProvider provider = modelProviderMapper.selectById(providerId);
            if (provider == null || !tenantId.equals(provider.getTenantId())) {
                return null;
            }
            return provider;
        }

        if (providerKey == null || providerKey.isBlank()) {
            return null;
        }
        return modelProviderMapper.selectOne(new QueryWrapper<ModelProvider>()
                .eq("tenant_id", tenantId)
                .eq("provider_type", ModelProviderType.STANDARD.name())
                .eq("provider_key", providerKey.toLowerCase(Locale.ROOT)));
    }

    private Map<String, Object> executeOpenAiCompatible(
            ModelProvider provider,
            String apiKey,
            String model,
            String systemPrompt,
            List<LlmMessage> messages,
            Double temperature,
            Double topP,
            Integer maxTokens,
            Map<String, Object> requestDetails,
            Duration timeout
    ) {
        Map<String, Object> request = new HashMap<>();
        request.put("model", model);
        request.put("messages", buildChatMessages(systemPrompt, messages));
        if (temperature != null) {
            request.put("temperature", temperature);
        }
        if (topP != null) {
            request.put("top_p", topP);
        }
        if (maxTokens != null) {
            request.put("max_tokens", maxTokens);
        }
        requestDetails.put("request", request);

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(provider.getBaseUrl())).build();
        ParameterizedTypeReference<Map<String, Object>> responseType =
                new ParameterizedTypeReference<>() {};
        Map<String, Object> response = client.post()
                .uri("/chat/completions")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .header("Authorization", "Bearer " + apiKey)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .block(timeout);

        if (response == null) {
            throw new IllegalStateException("LLM 响应为空");
        }
        return response;
    }

    private Map<String, Object> executeAnthropic(
            ModelProvider provider,
            String apiKey,
            String model,
            String systemPrompt,
            List<String> userPrompts,
            Double temperature,
            Double topP,
            Integer maxTokens,
            Map<String, Object> requestDetails,
            Duration timeout
    ) {
        Map<String, Object> request = new HashMap<>();
        request.put("model", model);
        request.put("messages", buildAnthropicMessages(userPrompts));
        request.put("max_tokens", maxTokens != null ? maxTokens : 1024);
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            request.put("system", systemPrompt);
        }
        if (temperature != null) {
            request.put("temperature", temperature);
        }
        if (topP != null) {
            request.put("top_p", topP);
        }
        requestDetails.put("request", request);

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(provider.getBaseUrl())).build();
        ParameterizedTypeReference<Map<String, Object>> responseType =
                new ParameterizedTypeReference<>() {};
        Map<String, Object> response = client.post()
                .uri("/v1/messages")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .header("x-api-key", apiKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .block(timeout);

        if (response == null) {
            throw new IllegalStateException("LLM 响应为空");
        }
        return response;
    }

    private Map<String, Object> executeGemini(
            ModelProvider provider,
            String apiKey,
            String model,
            String systemPrompt,
            List<String> userPrompts,
            Double temperature,
            Double topP,
            Integer maxTokens,
            Map<String, Object> requestDetails,
            Duration timeout
    ) {
        Map<String, Object> request = new HashMap<>();
        request.put("contents", buildGeminiContents(userPrompts));
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            request.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemPrompt))
            ));
        }
        Map<String, Object> generationConfig = new HashMap<>();
        if (temperature != null) {
            generationConfig.put("temperature", temperature);
        }
        if (topP != null) {
            generationConfig.put("topP", topP);
        }
        if (maxTokens != null) {
            generationConfig.put("maxOutputTokens", maxTokens);
        }
        if (!generationConfig.isEmpty()) {
            request.put("generationConfig", generationConfig);
        }
        requestDetails.put("request", request);

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(provider.getBaseUrl())).build();
        ParameterizedTypeReference<Map<String, Object>> responseType =
                new ParameterizedTypeReference<>() {};
        Map<String, Object> response = client.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/{model}:generateContent")
                        .queryParam("key", apiKey)
                        .build(model))
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .block(timeout);

        if (response == null) {
            throw new IllegalStateException("LLM 响应为空");
        }
        return response;
    }

    private List<Map<String, Object>> buildChatMessages(
            String systemPrompt,
            List<LlmMessage> messages
    ) {
        List<Map<String, Object>> chatMessages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            chatMessages.add(Map.of("role", "system", "content", systemPrompt));
        }
        for (LlmMessage message : messages) {
            if (message == null) {
                continue;
            }
            List<Map<String, Object>> parts = new ArrayList<>();
            for (LlmContentPart part : message.content) {
                if (part == null) {
                    continue;
                }
                if ("text".equals(part.type)) {
                    if (part.text == null || part.text.isBlank()) {
                        continue;
                    }
                    parts.add(Map.of("type", "text", "text", part.text));
                } else if ("image_url".equals(part.type)) {
                    if (part.url == null || part.url.isBlank()) {
                        continue;
                    }
                    parts.add(Map.of(
                            "type", "image_url",
                            "image_url", Map.of("url", part.url)
                    ));
                }
            }
            if (parts.isEmpty()) {
                continue;
            }
            if (parts.size() == 1 && "text".equals(parts.get(0).get("type"))) {
                chatMessages.add(Map.of("role", message.role, "content", parts.get(0).get("text")));
            } else {
                chatMessages.add(Map.of("role", message.role, "content", parts));
            }
        }
        return chatMessages;
    }

    private List<Map<String, String>> buildAnthropicMessages(List<String> userPrompts) {
        List<Map<String, String>> messages = new ArrayList<>();
        for (String prompt : userPrompts) {
            messages.add(Map.of("role", "user", "content", prompt));
        }
        return messages;
    }

    private List<Map<String, Object>> buildGeminiContents(List<String> userPrompts) {
        List<Map<String, Object>> contents = new ArrayList<>();
        for (String prompt : userPrompts) {
            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", prompt))
            ));
        }
        return contents;
    }

    private String extractText(Map<String, Object> response, String providerType, String providerKey) {
        if (ModelProviderType.STANDARD.name().equals(providerType) && "anthropic".equals(providerKey)) {
            Object content = response.get("content");
            if (content instanceof List) {
                StringBuilder builder = new StringBuilder();
                for (Object item : (List<?>) content) {
                    if (item instanceof Map) {
                        Object text = ((Map<?, ?>) item).get("text");
                        if (text != null) {
                            builder.append(text);
                        }
                    }
                }
                return builder.toString();
            }
            return null;
        }

        if (ModelProviderType.STANDARD.name().equals(providerType) && "gemini".equals(providerKey)) {
            Object candidates = response.get("candidates");
            if (candidates instanceof List && !((List<?>) candidates).isEmpty()) {
                Object candidate = ((List<?>) candidates).get(0);
                if (candidate instanceof Map) {
                    Object content = ((Map<?, ?>) candidate).get("content");
                    if (content instanceof Map) {
                        Object parts = ((Map<?, ?>) content).get("parts");
                        if (parts instanceof List) {
                            StringBuilder builder = new StringBuilder();
                            for (Object part : (List<?>) parts) {
                                if (part instanceof Map) {
                                    Object text = ((Map<?, ?>) part).get("text");
                                    if (text != null) {
                                        builder.append(text);
                                    }
                                }
                            }
                            return builder.toString();
                        }
                    }
                }
            }
            return null;
        }

        Object choices = response.get("choices");
        if (choices instanceof List && !((List<?>) choices).isEmpty()) {
            Object choice = ((List<?>) choices).get(0);
            if (choice instanceof Map) {
                Object message = ((Map<?, ?>) choice).get("message");
                if (message instanceof Map) {
                    Object content = ((Map<?, ?>) message).get("content");
                    return content != null ? content.toString() : null;
                }
            }
        }
        return null;
    }

    private Object extractUsage(Map<String, Object> response, String providerType) {
        if (ModelProviderType.STANDARD.name().equals(providerType)) {
            Object usage = response.get("usage");
            if (usage != null) {
                return usage;
            }
            Object usageMetadata = response.get("usageMetadata");
            if (usageMetadata != null) {
                return usageMetadata;
            }
        }
        return response.get("usage");
    }

    private String resolvePrompt(Map<String, Object> config, String key, Map<String, Object> allData) {
        String raw = getString(config, key, null);
        if (raw == null) {
            return null;
        }
        return TemplateResolver.resolve(raw, allData);
    }

    private List<LlmMessage> resolveMessages(Map<String, Object> config, Map<String, Object> allData) {
        List<LlmMessage> messages = new ArrayList<>();
        Object listValue = config.get("messages");
        if (listValue instanceof List) {
            for (Object item : (List<?>) listValue) {
                if (!(item instanceof Map)) {
                    continue;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> rawMessage = (Map<String, Object>) item;
                String role = Objects.toString(rawMessage.get("role"), "user").trim();
                if (role.isEmpty()) {
                    role = "user";
                }
                List<LlmContentPart> parts = resolveContentParts(rawMessage.get("content"), allData);
                if (!parts.isEmpty()) {
                    messages.add(new LlmMessage(role, parts));
                }
            }
        }

        if (!messages.isEmpty()) {
            return messages;
        }

        // 兼容旧配置：userPrompts + imageUrls
        List<String> prompts = resolveUserPrompts(config, allData);
        List<String> imageUrls = resolveImageUrls(config, allData);
        if (prompts.isEmpty() && imageUrls.isEmpty()) {
            return messages;
        }
        List<LlmMessage> legacyMessages = new ArrayList<>();
        for (String prompt : prompts) {
            List<LlmContentPart> parts = new ArrayList<>();
            if (prompt != null && !prompt.isBlank()) {
                parts.add(LlmContentPart.text(prompt));
            }
            if (!parts.isEmpty()) {
                legacyMessages.add(new LlmMessage("user", parts));
            }
        }
        if (!imageUrls.isEmpty()) {
            if (legacyMessages.isEmpty()) {
                List<LlmContentPart> parts = new ArrayList<>();
                for (String url : imageUrls) {
                    if (url != null && !url.isBlank()) {
                        parts.add(LlmContentPart.image(url));
                    }
                }
                if (!parts.isEmpty()) {
                    legacyMessages.add(new LlmMessage("user", parts));
                }
            } else {
                LlmMessage first = legacyMessages.get(0);
                List<LlmContentPart> merged = new ArrayList<>(first.content);
                for (String url : imageUrls) {
                    if (url != null && !url.isBlank()) {
                        merged.add(LlmContentPart.image(url));
                    }
                }
                legacyMessages.set(0, new LlmMessage(first.role, merged));
            }
        }
        return legacyMessages;
    }

    private List<LlmContentPart> resolveContentParts(Object rawContent, Map<String, Object> allData) {
        List<LlmContentPart> parts = new ArrayList<>();
        if (rawContent instanceof List) {
            for (Object partObj : (List<?>) rawContent) {
                if (partObj instanceof String) {
                    String resolved = TemplateResolver.resolve(partObj.toString(), allData);
                    if (!resolved.isBlank()) {
                        parts.add(LlmContentPart.text(resolved));
                    }
                    continue;
                }
                if (!(partObj instanceof Map)) {
                    continue;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> partMap = (Map<String, Object>) partObj;
                String type = Objects.toString(partMap.get("type"), "").trim().toLowerCase(Locale.ROOT);
                if (type.isEmpty()) {
                    if (partMap.containsKey("text")) {
                        type = "text";
                    } else if (partMap.containsKey("url") || partMap.containsKey("imageUrl")
                            || partMap.containsKey("image_url")) {
                        type = "image_url";
                    }
                }
                if ("text".equals(type)) {
                    String text = Objects.toString(partMap.get("text"), "");
                    String resolved = TemplateResolver.resolve(text, allData);
                    if (!resolved.isBlank()) {
                        parts.add(LlmContentPart.text(resolved));
                    }
                } else if ("image_url".equals(type)) {
                    String url = Objects.toString(partMap.get("url"), "");
                    if (url.isBlank()) {
                        url = Objects.toString(partMap.get("imageUrl"), "");
                    }
                    if (url.isBlank()) {
                        Object imageUrlObj = partMap.get("image_url");
                        if (imageUrlObj instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> imageUrlMap = (Map<String, Object>) imageUrlObj;
                            url = Objects.toString(imageUrlMap.get("url"), "");
                        }
                    }
                    String resolved = TemplateResolver.resolve(url, allData).trim();
                    if (!resolved.isBlank()) {
                        parts.add(LlmContentPart.image(resolved));
                    }
                }
            }
        } else if (rawContent instanceof String) {
            String resolved = TemplateResolver.resolve(rawContent.toString(), allData);
            if (!resolved.isBlank()) {
                parts.add(LlmContentPart.text(resolved));
            }
        }
        return parts;
    }

    private List<String> resolveUserPrompts(Map<String, Object> config, Map<String, Object> allData) {
        List<String> prompts = new ArrayList<>();

        Object listValue = config.get("userPrompts");
        if (listValue instanceof List) {
            for (Object item : (List<?>) listValue) {
                if (item == null) {
                    continue;
                }
                String resolved = TemplateResolver.resolve(item.toString(), allData);
                if (!resolved.isBlank()) {
                    prompts.add(resolved);
                }
            }
        }

        if (prompts.isEmpty()) {
            String userPrompt = resolvePrompt(config, "userPrompt", allData);
            if (userPrompt == null || userPrompt.isBlank()) {
                userPrompt = resolvePrompt(config, "prompt", allData);
            }
            if (userPrompt != null && !userPrompt.isBlank()) {
                prompts.add(userPrompt);
            }
        }

        return prompts;
    }

    private List<String> resolveImageUrls(Map<String, Object> config, Map<String, Object> allData) {
        List<String> urls = new ArrayList<>();

        Object listValue = config.get("imageUrls");
        if (listValue instanceof List) {
            for (Object item : (List<?>) listValue) {
                if (item == null) {
                    continue;
                }
                String resolved = TemplateResolver.resolve(item.toString(), allData).trim();
                if (!resolved.isBlank()) {
                    urls.add(resolved);
                }
            }
        } else if (listValue != null) {
            String resolved = TemplateResolver.resolve(listValue.toString(), allData).trim();
            if (!resolved.isBlank()) {
                urls.add(resolved);
            }
        }

        return urls;
    }

    private List<String> toUserPrompts(List<LlmMessage> messages) {
        List<String> prompts = new ArrayList<>();
        for (LlmMessage message : messages) {
            if (message == null || !"user".equalsIgnoreCase(message.role)) {
                continue;
            }
            StringBuilder builder = new StringBuilder();
            for (LlmContentPart part : message.content) {
                if (part == null || !"text".equals(part.type)) {
                    continue;
                }
                if (builder.length() > 0) {
                    builder.append('\n');
                }
                builder.append(part.text);
            }
            String combined = builder.toString().trim();
            if (!combined.isBlank()) {
                prompts.add(combined);
            }
        }
        return prompts;
    }

    private List<Map<String, Object>> toMessageDetails(List<LlmMessage> messages) {
        List<Map<String, Object>> details = new ArrayList<>();
        for (LlmMessage message : messages) {
            if (message == null) {
                continue;
            }
            List<Map<String, Object>> parts = new ArrayList<>();
            for (LlmContentPart part : message.content) {
                if (part == null) {
                    continue;
                }
                if ("text".equals(part.type)) {
                    parts.add(Map.of("type", "text", "text", part.text));
                } else if ("image_url".equals(part.type)) {
                    parts.add(Map.of("type", "image_url", "url", part.url));
                }
            }
            details.add(Map.of("role", message.role, "content", parts));
        }
        return details;
    }

    private static class LlmMessage {
        private final String role;
        private final List<LlmContentPart> content;

        private LlmMessage(String role, List<LlmContentPart> content) {
            this.role = role;
            this.content = content;
        }
    }

    private static class LlmContentPart {
        private final String type;
        private final String text;
        private final String url;

        private LlmContentPart(String type, String text, String url) {
            this.type = type;
            this.text = text;
            this.url = url;
        }

        private static LlmContentPart text(String text) {
            return new LlmContentPart("text", text, null);
        }

        private static LlmContentPart image(String url) {
            return new LlmContentPart("image_url", null, url);
        }
    }

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

    private boolean getBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.parseBoolean(value.toString());
    }

    private List<String> getStringList(Object value) {
        List<String> items = new ArrayList<>();
        if (value instanceof List) {
            for (Object item : (List<?>) value) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    items.add(item.toString().trim());
                }
            }
        }
        return items;
    }

    private Map<String, Object> parseJsonOutput(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        String jsonPayload = extractJsonPayload(text);
        if (jsonPayload == null || jsonPayload.isBlank()) {
            return null;
        }

        try {
            Object parsed = lenientMapper.readValue(jsonPayload, Object.class);
            if (parsed instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) parsed;
                return result;
            }
            if (parsed instanceof List) {
                List<?> list = (List<?>) parsed;
                if (!list.isEmpty() && list.get(0) instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = (Map<String, Object>) list.get(0);
                    return result;
                }
            }
        } catch (JsonProcessingException ex) {
            log.warn("LLM 输出 JSON 解析失败: {}", ex.getMessage());
        }

        return null;
    }

    private String extractJsonPayload(String text) {
        String trimmed = text.trim();
        Matcher matcher = CODE_FENCE_PATTERN.matcher(trimmed);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        int objectStart = trimmed.indexOf('{');
        int objectEnd = trimmed.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            return trimmed.substring(objectStart, objectEnd + 1).trim();
        }

        int arrayStart = trimmed.indexOf('[');
        int arrayEnd = trimmed.lastIndexOf(']');
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            return trimmed.substring(arrayStart, arrayEnd + 1).trim();
        }

        return trimmed;
    }
}
