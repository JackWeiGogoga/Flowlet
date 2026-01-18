package com.flowlet.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.flowlet.dto.model.CustomProviderRequest;
import com.flowlet.dto.model.CustomProviderResponse;
import com.flowlet.dto.model.ModelProviderListResponse;
import com.flowlet.dto.model.ModelProviderTestRequest;
import com.flowlet.dto.model.ModelProviderTestResponse;
import com.flowlet.dto.model.StandardProviderModelCatalogResponse;
import com.flowlet.dto.model.StandardProviderModelItem;
import com.flowlet.dto.model.StandardProviderModelRefreshRequest;
import com.flowlet.dto.model.StandardProviderResponse;
import com.flowlet.dto.model.UpsertStandardProviderRequest;
import com.flowlet.entity.ModelProvider;
import com.flowlet.enums.ModelProviderType;
import com.flowlet.exception.BusinessException;
import com.flowlet.exception.ResourceNotFoundException;
import com.flowlet.mapper.ModelProviderMapper;
import com.flowlet.service.ModelProviderService;
import com.flowlet.util.ModelHubCrypto;
import com.flowlet.util.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.lang.NonNull;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ModelProviderServiceImpl implements ModelProviderService {

    private static final Duration TEST_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration MODEL_LIST_TIMEOUT = Duration.ofSeconds(12);
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private final ModelProviderMapper modelProviderMapper;
    private final ModelHubCrypto modelHubCrypto;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    private static class StandardModelSettings {
        private final List<String> enabledModels;
        private final List<StandardProviderModelItem> catalog;

        private StandardModelSettings(List<String> enabledModels, List<StandardProviderModelItem> catalog) {
            this.enabledModels = enabledModels;
            this.catalog = catalog;
        }
    }

    @Override
    public ModelProviderListResponse listProviders() {
        String tenantId = SecurityUtils.getCurrentTenantId();
        List<ModelProvider> providers = modelProviderMapper.selectList(
                new QueryWrapper<ModelProvider>()
                        .eq("tenant_id", tenantId)
                        .orderByDesc("updated_at"));

        List<StandardProviderResponse> standardProviders = providers.stream()
                .filter(provider -> ModelProviderType.STANDARD.name().equals(provider.getProviderType()))
                .map(this::toStandardResponse)
                .collect(Collectors.toList());

        List<CustomProviderResponse> customProviders = providers.stream()
                .filter(provider -> ModelProviderType.CUSTOM.name().equals(provider.getProviderType()))
                .map(this::toCustomResponse)
                .collect(Collectors.toList());

        ModelProviderListResponse response = new ModelProviderListResponse();
        response.setStandardProviders(standardProviders);
        response.setCustomProviders(customProviders);
        return response;
    }

    @Override
    public StandardProviderResponse upsertStandard(String providerKey, UpsertStandardProviderRequest request) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        String normalizedKey = providerKey.toLowerCase(Locale.ROOT);

        ModelProvider existing = findStandardProvider(tenantId, normalizedKey);
        if (existing == null
                && (request.getApiKey() == null || request.getApiKey().isBlank())
                && !Boolean.TRUE.equals(request.getClearKey())) {
            throw new BusinessException("API Key 不能为空");
        }

        ModelProvider provider = existing == null ? new ModelProvider() : existing;
        if (existing == null) {
            provider.setProviderType(ModelProviderType.STANDARD.name());
            provider.setProviderKey(normalizedKey);
            provider.setTenantId(tenantId);
            provider.setCreatedBy(SecurityUtils.requireCurrentUserId());
        }

        provider.setBaseUrl(request.getBaseUrl().trim());
        provider.setDefaultModel(Optional.ofNullable(request.getDefaultModel())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(null));
        provider.setEnabled(request.getEnabled() != null ? request.getEnabled() : Boolean.TRUE);
        StandardModelSettings settings = resolveStandardModelSettings(provider);
        List<String> enabledModels = normalizeStandardEnabledModels(request.getModels());
        if (!enabledModels.isEmpty() || request.getModels() != null) {
            provider.setModels(encodeStandardModels(settings.catalog, enabledModels));
        } else if (!settings.catalog.isEmpty() || !settings.enabledModels.isEmpty()) {
            provider.setModels(encodeStandardModels(settings.catalog, settings.enabledModels));
        }

        if (Boolean.TRUE.equals(request.getClearKey())) {
            provider.setApiKeyEncrypted(null);
        } else if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            provider.setApiKeyEncrypted(modelHubCrypto.encrypt(request.getApiKey().trim()));
        }

        if (existing == null) {
            modelProviderMapper.insert(provider);
        } else {
            modelProviderMapper.updateById(provider);
        }
        return toStandardResponse(provider);
    }

    @Override
    public void deleteStandard(String providerKey) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        String normalizedKey = providerKey.toLowerCase(Locale.ROOT);
        modelProviderMapper.delete(new QueryWrapper<ModelProvider>()
                .eq("tenant_id", tenantId)
                .eq("provider_type", ModelProviderType.STANDARD.name())
                .eq("provider_key", normalizedKey));
    }

    @Override
    public CustomProviderResponse createCustom(CustomProviderRequest request) {
        if ((request.getApiKey() == null || request.getApiKey().isBlank())
                && !Boolean.TRUE.equals(request.getClearKey())) {
            throw new BusinessException("API Key 不能为空");
        }
        List<String> models = normalizeModels(request);
        ModelProvider provider = new ModelProvider();
        provider.setProviderType(ModelProviderType.CUSTOM.name());
        provider.setTenantId(SecurityUtils.getCurrentTenantId());
        provider.setCreatedBy(SecurityUtils.requireCurrentUserId());
        provider.setName(request.getName().trim());
        provider.setBaseUrl(request.getBaseUrl().trim());
        provider.setDefaultModel(resolveDefaultModel(request.getModel(), models));
        provider.setModels(encodeModels(models));
        provider.setEnabled(request.getEnabled() != null ? request.getEnabled() : Boolean.TRUE);
        if (Boolean.TRUE.equals(request.getClearKey())) {
            provider.setApiKeyEncrypted(null);
        } else {
            provider.setApiKeyEncrypted(modelHubCrypto.encrypt(request.getApiKey().trim()));
        }
        modelProviderMapper.insert(provider);
        return toCustomResponse(provider);
    }

    @Override
    public CustomProviderResponse updateCustom(String id, CustomProviderRequest request) {
        ModelProvider provider = getByIdAndTenant(id);
        List<String> models = normalizeModels(request);
        provider.setName(request.getName().trim());
        provider.setBaseUrl(request.getBaseUrl().trim());
        provider.setDefaultModel(resolveDefaultModel(request.getModel(), models));
        provider.setModels(encodeModels(models));
        if (request.getEnabled() != null) {
            provider.setEnabled(request.getEnabled());
        }

        if (Boolean.TRUE.equals(request.getClearKey())) {
            provider.setApiKeyEncrypted(null);
        } else if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            provider.setApiKeyEncrypted(modelHubCrypto.encrypt(request.getApiKey().trim()));
        }

        modelProviderMapper.updateById(provider);
        return toCustomResponse(provider);
    }

    @Override
    public void deleteCustom(String id) {
        ModelProvider provider = getByIdAndTenant(id);
        modelProviderMapper.deleteById(provider.getId());
    }

    @Override
    public CustomProviderResponse toggleCustom(String id, boolean enabled) {
        ModelProvider provider = getByIdAndTenant(id);
        provider.setEnabled(enabled);
        modelProviderMapper.updateById(provider);
        return toCustomResponse(provider);
    }

    @Override
    public ModelProviderTestResponse testConnection(ModelProviderTestRequest request) {
        String providerKey = Optional.ofNullable(request.getProviderKey())
                .map(String::toLowerCase)
                .orElse("");
        String providerType = Optional.ofNullable(request.getProviderType())
                .map(String::toUpperCase)
                .orElse(ModelProviderType.CUSTOM.name());
        String baseUrl = Objects.requireNonNull(request.getBaseUrl().trim());
        String apiKey = Optional.ofNullable(request.getApiKey())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElseGet(() -> resolveStoredApiKey(providerType, providerKey, request.getProviderId()));
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("API Key 不能为空");
        }

        long start = System.currentTimeMillis();
        try {
            HttpStatusCode status = executeTest(providerType, providerKey, baseUrl, apiKey);
            long latency = System.currentTimeMillis() - start;
            if (status.is2xxSuccessful()) {
                return new ModelProviderTestResponse(true, "连接成功", latency);
            }
            return new ModelProviderTestResponse(false, "连接失败: " + status, latency);
        } catch (WebClientResponseException ex) {
            long latency = System.currentTimeMillis() - start;
            return new ModelProviderTestResponse(false,
                    "连接失败: " + ex.getStatusCode() + " " + ex.getStatusText(),
                    latency);
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            return new ModelProviderTestResponse(false,
                    "连接失败: " + ex.getMessage(),
                    latency);
        }
    }

    @Override
    public StandardProviderModelCatalogResponse refreshStandardModels(
            String providerKey,
            StandardProviderModelRefreshRequest request
    ) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        String normalizedKey = providerKey.toLowerCase(Locale.ROOT);
        ModelProvider provider = findStandardProvider(tenantId, normalizedKey);
        if (provider == null) {
            throw new ResourceNotFoundException("Model provider not found");
        }

        String baseUrl = Optional.ofNullable(request.getBaseUrl())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(provider.getBaseUrl());
        String apiKey = Optional.ofNullable(request.getApiKey())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElseGet(() -> resolveStoredApiKey(ModelProviderType.STANDARD.name(), normalizedKey, null));
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("API Key 不能为空");
        }

        List<StandardProviderModelItem> catalog = fetchStandardModelCatalog(normalizedKey, Objects.requireNonNull(baseUrl), apiKey);
        StandardModelSettings existing = resolveStandardModelSettings(provider);
        List<String> enabled = existing.enabledModels;
        if (enabled.isEmpty()) {
            enabled = catalog.stream()
                    .map(StandardProviderModelItem::getId)
                    .filter(id -> id != null && !id.isBlank())
                    .toList();
        }

        provider.setBaseUrl(baseUrl);
        provider.setModels(encodeStandardModels(catalog, enabled));
        modelProviderMapper.updateById(provider);

        StandardProviderModelCatalogResponse response = new StandardProviderModelCatalogResponse();
        response.setModelCatalog(catalog);
        response.setEnabledModels(enabled);
        return response;
    }

    private String resolveStoredApiKey(String providerType, String providerKey, String providerId) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        ModelProvider provider = null;
        if (providerId != null && !providerId.isBlank()) {
            provider = getByIdAndTenant(providerId);
        } else if (ModelProviderType.STANDARD.name().equals(providerType) && providerKey != null && !providerKey.isBlank()) {
            provider = findStandardProvider(tenantId, providerKey.toLowerCase(Locale.ROOT));
        }
        if (provider == null || provider.getApiKeyEncrypted() == null || provider.getApiKeyEncrypted().isBlank()) {
            return null;
        }
        return modelHubCrypto.decrypt(provider.getApiKeyEncrypted());
    }

    private HttpStatusCode executeTest(String providerType, String providerKey, @NonNull String baseUrl, String apiKey) {
        WebClient client = webClientBuilder.baseUrl(baseUrl).build();

        if ("STANDARD".equals(providerType) && "anthropic".equals(providerKey)) {
            var response = client.get()
                    .uri("/v1/models")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .retrieve()
                    .toBodilessEntity()
                    .block(TEST_TIMEOUT);
            if (response == null) {
                throw new IllegalStateException("连接超时");
            }
            return response.getStatusCode();
        }

        if ("STANDARD".equals(providerType) && "gemini".equals(providerKey)) {
            var response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/models")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .toBodilessEntity()
                    .block(TEST_TIMEOUT);
            if (response == null) {
                throw new IllegalStateException("连接超时");
            }
            return response.getStatusCode();
        }

        var response = client.get()
                .uri("/models")
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .toBodilessEntity()
                .block(TEST_TIMEOUT);
        if (response == null) {
            throw new IllegalStateException("连接超时");
        }
        return response.getStatusCode();
    }

    private ModelProvider getByIdAndTenant(String id) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        ModelProvider provider = modelProviderMapper.selectById(id);
        if (provider == null || !tenantId.equals(provider.getTenantId())) {
            throw new ResourceNotFoundException("Model provider not found");
        }
        return provider;
    }

    private ModelProvider findStandardProvider(String tenantId, String providerKey) {
        return modelProviderMapper.selectOne(new QueryWrapper<ModelProvider>()
                .eq("tenant_id", tenantId)
                .eq("provider_type", ModelProviderType.STANDARD.name())
                .eq("provider_key", providerKey));
    }

    private StandardProviderResponse toStandardResponse(ModelProvider provider) {
        StandardProviderResponse response = new StandardProviderResponse();
        StandardModelSettings settings = resolveStandardModelSettings(provider);
        response.setProviderKey(provider.getProviderKey());
        response.setBaseUrl(provider.getBaseUrl());
        response.setDefaultModel(provider.getDefaultModel());
        response.setModels(settings.enabledModels);
        response.setModelCatalog(settings.catalog);
        response.setEnabled(Boolean.TRUE.equals(provider.getEnabled()));
        response.setHasKey(provider.getApiKeyEncrypted() != null && !provider.getApiKeyEncrypted().isBlank());
        response.setCreatedAt(provider.getCreatedAt());
        response.setUpdatedAt(provider.getUpdatedAt());
        return response;
    }

    private CustomProviderResponse toCustomResponse(ModelProvider provider) {
        CustomProviderResponse response = new CustomProviderResponse();
        response.setId(provider.getId());
        response.setName(provider.getName());
        response.setBaseUrl(provider.getBaseUrl());
        response.setModel(provider.getDefaultModel());
        response.setModels(resolveModels(provider));
        response.setHasKey(provider.getApiKeyEncrypted() != null && !provider.getApiKeyEncrypted().isBlank());
        response.setEnabled(Boolean.TRUE.equals(provider.getEnabled()));
        response.setCreatedAt(provider.getCreatedAt());
        response.setUpdatedAt(provider.getUpdatedAt());
        return response;
    }

    private List<String> normalizeModels(CustomProviderRequest request) {
        List<String> requested = Optional.ofNullable(request.getModels())
                .orElseGet(List::of)
                .stream()
                .flatMap(value -> value == null ? Stream.empty() : Stream.of(value))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        if (requested.isEmpty()) {
            String fallback = Optional.ofNullable(request.getModel())
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .orElse(null);
            if (fallback != null) {
                requested = List.of(fallback);
            }
        }
        if (requested.isEmpty()) {
            throw new BusinessException("模型列表不能为空");
        }
        return requested;
    }

    private String resolveDefaultModel(String requested, List<String> models) {
        String candidate = Optional.ofNullable(requested)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(null);
        if (candidate != null) {
            return candidate;
        }
        return models.isEmpty() ? null : models.get(0);
    }

    private String encodeModels(List<String> models) {
        try {
            return objectMapper.writeValueAsString(models);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("无法序列化模型列表", e);
        }
    }

    private List<String> resolveModels(ModelProvider provider) {
        String stored = provider.getModels();
        if (stored != null && !stored.isBlank()) {
            try {
                return objectMapper.readValue(
                        stored,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            } catch (Exception ex) {
                List<String> parsed = Stream.of(stored.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .distinct()
                        .collect(Collectors.toList());
                if (!parsed.isEmpty()) {
                    return parsed;
                }
            }
        }
        String defaultModel = provider.getDefaultModel();
        if (defaultModel == null || defaultModel.isBlank()) {
            return List.of();
        }
        return List.of(defaultModel.trim());
    }

    private StandardModelSettings resolveStandardModelSettings(ModelProvider provider) {
        String stored = provider.getModels();
        if (stored == null || stored.isBlank()) {
            return new StandardModelSettings(List.of(), List.of());
        }
        try {
            var node = objectMapper.readTree(stored);
            if (node.isObject()) {
                List<String> enabled = new ArrayList<>();
                if (node.has("enabled") && node.get("enabled").isArray()) {
                    node.get("enabled").forEach(item -> {
                        if (item.isTextual()) {
                            enabled.add(item.asText());
                        }
                    });
                }
                List<StandardProviderModelItem> catalog = new ArrayList<>();
                if (node.has("catalog") && node.get("catalog").isArray()) {
                    for (var itemNode : node.get("catalog")) {
                        StandardProviderModelItem item = objectMapper.treeToValue(
                                itemNode, StandardProviderModelItem.class);
                        if (item != null && item.getId() != null && !item.getId().isBlank()) {
                            catalog.add(item);
                        }
                    }
                }
                return new StandardModelSettings(enabled, catalog);
            }
            if (node.isArray()) {
                List<String> enabled = new ArrayList<>();
                node.forEach(item -> {
                    if (item.isTextual()) {
                        enabled.add(item.asText());
                    }
                });
                return new StandardModelSettings(enabled, List.of());
            }
        } catch (Exception ex) {
            log.warn("解析标准模型配置失败: {}", ex.getMessage());
        }
        return new StandardModelSettings(List.of(), List.of());
    }

    private String encodeStandardModels(List<StandardProviderModelItem> catalog, List<String> enabledModels) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("enabled", enabledModels);
        payload.put("catalog", catalog);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("无法序列化模型列表", e);
        }
    }

    private List<String> normalizeStandardEnabledModels(List<String> models) {
        if (models == null) {
            return List.of();
        }
        return models.stream()
                .flatMap(value -> value == null ? Stream.empty() : Stream.of(value))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private List<StandardProviderModelItem> fetchStandardModelCatalog(
            String providerKey,
            @NonNull String baseUrl,
            @NonNull String apiKey
    ) {
        WebClient client = webClientBuilder.baseUrl(baseUrl).build();
        ParameterizedTypeReference<Map<String, Object>> responseType =
                new ParameterizedTypeReference<>() {};
        Map<String, Object> response;

        if ("anthropic".equals(providerKey)) {
            response = client.get()
                    .uri("/v1/models")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .retrieve()
                    .bodyToMono(responseType)
                    .block(MODEL_LIST_TIMEOUT);
            return parseAnthropicModelList(response);
        }

        if ("gemini".equals(providerKey)) {
            response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/models")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .bodyToMono(responseType)
                    .block(MODEL_LIST_TIMEOUT);
            return parseGeminiModelList(response);
        }

        if ("openrouter".equals(providerKey)) {
            response = client.get()
                    .uri("/models")
                    .header("Authorization", "Bearer " + apiKey)
                    .retrieve()
                    .bodyToMono(responseType)
                    .block(MODEL_LIST_TIMEOUT);
            return parseOpenRouterModelList(response);
        }

        response = client.get()
                .uri("/models")
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .bodyToMono(responseType)
                .block(MODEL_LIST_TIMEOUT);
        return parseOpenAiStyleModelList(response);
    }

    private List<StandardProviderModelItem> parseOpenAiStyleModelList(Map<String, Object> response) {
        if (response == null) {
            return List.of();
        }
        Object data = response.get("data");
        if (!(data instanceof List<?> list)) {
            return List.of();
        }
        List<StandardProviderModelItem> items = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Object idValue = map.get("id");
                if (idValue == null) {
                    continue;
                }
                String id = idValue.toString();
                String type = classifyModelTypeById(id);
                StandardProviderModelItem model = new StandardProviderModelItem();
                model.setId(id);
                model.setType(type);
                items.add(model);
            }
        }
        return items;
    }

    private List<StandardProviderModelItem> parseAnthropicModelList(Map<String, Object> response) {
        if (response == null) {
            return List.of();
        }
        Object data = response.get("data");
        if (!(data instanceof List<?> list)) {
            return List.of();
        }
        List<StandardProviderModelItem> items = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Object idValue = map.get("id");
                if (idValue == null) {
                    continue;
                }
                StandardProviderModelItem model = new StandardProviderModelItem();
                model.setId(idValue.toString());
                items.add(model);
            }
        }
        return items;
    }

    private List<StandardProviderModelItem> parseGeminiModelList(Map<String, Object> response) {
        if (response == null) {
            return List.of();
        }
        Object models = response.get("models");
        if (!(models instanceof List<?> list)) {
            return List.of();
        }
        List<StandardProviderModelItem> items = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Object nameValue = map.get("name");
                if (nameValue == null) {
                    continue;
                }
                String id = nameValue.toString();
                if (id.startsWith("models/")) {
                    id = id.substring("models/".length());
                }
                String type = classifyGeminiModelType(map);
                StandardProviderModelItem model = new StandardProviderModelItem();
                model.setId(id);
                model.setType(type);
                items.add(model);
            }
        }
        return items;
    }

    private List<StandardProviderModelItem> parseOpenRouterModelList(Map<String, Object> response) {
        if (response == null) {
            return List.of();
        }
        Object data = response.get("data");
        if (!(data instanceof List<?> list)) {
            return List.of();
        }
        List<StandardProviderModelItem> items = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Object idValue = map.get("id");
                if (idValue == null) {
                    continue;
                }
                String id = idValue.toString();
                String type = null;
                Boolean multimodal = null;
                Object architecture = map.get("architecture");
                if (architecture instanceof Map<?, ?> archMap) {
                    Object modalityValue = archMap.get("modality");
                    if (modalityValue != null) {
                        String modality = modalityValue.toString().toLowerCase(Locale.ROOT);
                        if (modality.contains("multimodal")) {
                            type = "multimodal";
                            multimodal = Boolean.TRUE;
                        } else if (modality.contains("text")) {
                            type = "text";
                        } else if (modality.contains("image")) {
                            type = "image";
                        } else if (modality.contains("audio")) {
                            type = "audio";
                        } else if (modality.contains("embedding")) {
                            type = "embedding";
                        }
                    }
                }
                StandardProviderModelItem model = new StandardProviderModelItem();
                model.setId(id);
                model.setType(type);
                model.setMultimodal(multimodal);
                items.add(model);
            }
        }
        return items;
    }

    private String classifyModelTypeById(String id) {
        String lower = id.toLowerCase(Locale.ROOT);
        if (lower.contains("embedding")) {
            return "embedding";
        }
        if (lower.contains("whisper") || lower.contains("audio") || lower.contains("tts")) {
            return "audio";
        }
        if (lower.contains("dall-e") || lower.contains("image")) {
            return "image";
        }
        return null;
    }

    private String classifyGeminiModelType(Map<?, ?> map) {
        Object methods = map.get("supportedGenerationMethods");
        if (methods instanceof List<?> list) {
            boolean hasGenerate = list.stream().anyMatch(item -> "generateContent".equals(item));
            boolean hasEmbed = list.stream().anyMatch(item -> "embedContent".equals(item));
            if (hasEmbed && !hasGenerate) {
                return "embedding";
            }
            if (hasGenerate) {
                return "text";
            }
        }
        return null;
    }
}
