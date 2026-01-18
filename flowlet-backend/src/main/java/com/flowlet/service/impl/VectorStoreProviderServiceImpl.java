package com.flowlet.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.vectorstore.VectorStoreProviderRequest;
import com.flowlet.dto.vectorstore.VectorStoreProviderResponse;
import com.flowlet.entity.VectorStoreProvider;
import com.flowlet.exception.BusinessException;
import com.flowlet.exception.ResourceNotFoundException;
import com.flowlet.mapper.VectorStoreProviderMapper;
import com.flowlet.service.VectorStoreProviderService;
import com.flowlet.util.ModelHubCrypto;
import com.flowlet.util.SecurityUtils;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class VectorStoreProviderServiceImpl implements VectorStoreProviderService {

    private static final Set<String> SUPPORTED_KEYS = Set.of("milvus", "qdrant");

    private final VectorStoreProviderMapper vectorStoreProviderMapper;
    private final ModelHubCrypto modelHubCrypto;
    private final ObjectMapper objectMapper;

    @Data
    private static class VectorStoreConfig {
        private String database;
        private String grpcUrl;
        private Boolean preferGrpc;
    }

    @Override
    public List<VectorStoreProviderResponse> listProviders() {
        String tenantId = SecurityUtils.getCurrentTenantId();
        List<VectorStoreProvider> providers = vectorStoreProviderMapper.selectList(
                new QueryWrapper<VectorStoreProvider>()
                        .eq("tenant_id", tenantId)
                        .orderByDesc("updated_at"));
        return providers.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public VectorStoreProviderResponse createProvider(VectorStoreProviderRequest request) {
        String providerKey = normalizeProviderKey(request.getProviderKey());
        VectorStoreProvider provider = new VectorStoreProvider();
        provider.setTenantId(SecurityUtils.getCurrentTenantId());
        provider.setCreatedBy(SecurityUtils.requireCurrentUserId());
        provider.setProviderKey(providerKey);
        provider.setName(request.getName().trim());
        provider.setBaseUrl(request.getBaseUrl().trim());
        provider.setEnabled(request.getEnabled() != null ? request.getEnabled() : Boolean.TRUE);
        provider.setConfigJson(encodeConfig(request));

        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            provider.setApiKeyEncrypted(modelHubCrypto.encrypt(request.getApiKey().trim()));
        }

        vectorStoreProviderMapper.insert(provider);
        return toResponse(provider);
    }

    @Override
    public VectorStoreProviderResponse updateProvider(String id, VectorStoreProviderRequest request) {
        VectorStoreProvider provider = getByIdAndTenant(id);
        provider.setProviderKey(normalizeProviderKey(request.getProviderKey()));
        provider.setName(request.getName().trim());
        provider.setBaseUrl(request.getBaseUrl().trim());
        provider.setConfigJson(encodeConfig(request));
        if (request.getEnabled() != null) {
            provider.setEnabled(request.getEnabled());
        }

        if (Boolean.TRUE.equals(request.getClearKey())) {
            provider.setApiKeyEncrypted(null);
        } else if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            provider.setApiKeyEncrypted(modelHubCrypto.encrypt(request.getApiKey().trim()));
        }

        vectorStoreProviderMapper.updateById(provider);
        return toResponse(provider);
    }

    @Override
    public void deleteProvider(String id) {
        VectorStoreProvider provider = getByIdAndTenant(id);
        vectorStoreProviderMapper.deleteById(provider.getId());
    }

    @Override
    public VectorStoreProviderResponse toggleProvider(String id, boolean enabled) {
        VectorStoreProvider provider = getByIdAndTenant(id);
        provider.setEnabled(enabled);
        vectorStoreProviderMapper.updateById(provider);
        return toResponse(provider);
    }

    private String normalizeProviderKey(String providerKey) {
        String normalized = providerKey == null ? "" : providerKey.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_KEYS.contains(normalized)) {
            throw new BusinessException("暂不支持的向量存储类型: " + providerKey);
        }
        return normalized;
    }

    private VectorStoreProvider getByIdAndTenant(String id) {
        VectorStoreProvider provider = vectorStoreProviderMapper.selectById(id);
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (provider == null || !tenantId.equals(provider.getTenantId())) {
            throw new ResourceNotFoundException("Vector store provider not found");
        }
        return provider;
    }

    private VectorStoreProviderResponse toResponse(VectorStoreProvider provider) {
        VectorStoreProviderResponse response = new VectorStoreProviderResponse();
        response.setId(provider.getId());
        response.setName(provider.getName());
        response.setProviderKey(provider.getProviderKey());
        response.setBaseUrl(provider.getBaseUrl());
        response.setEnabled(provider.getEnabled());
        response.setHasKey(provider.getApiKeyEncrypted() != null && !provider.getApiKeyEncrypted().isBlank());
        response.setCreatedAt(provider.getCreatedAt());
        response.setUpdatedAt(provider.getUpdatedAt());

        VectorStoreConfig config = decodeConfig(provider.getConfigJson());
        response.setDatabase(config.database);
        response.setGrpcUrl(config.grpcUrl);
        response.setPreferGrpc(config.preferGrpc);
        return response;
    }

    private String encodeConfig(VectorStoreProviderRequest request) {
        Map<String, Object> config = new HashMap<>();
        if (request.getDatabase() != null && !request.getDatabase().isBlank()) {
            config.put("database", request.getDatabase().trim());
        }
        if (request.getGrpcUrl() != null && !request.getGrpcUrl().isBlank()) {
            config.put("grpcUrl", request.getGrpcUrl().trim());
        }
        if (request.getPreferGrpc() != null) {
            config.put("preferGrpc", request.getPreferGrpc());
        }
        if (config.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(config);
        } catch (Exception ex) {
            log.warn("向量存储配置序列化失败", ex);
            return null;
        }
    }

    private VectorStoreConfig decodeConfig(String configJson) {
        if (configJson == null || configJson.isBlank()) {
            return new VectorStoreConfig();
        }
        try {
            return objectMapper.readValue(configJson, VectorStoreConfig.class);
        } catch (Exception ex) {
            log.warn("向量存储配置解析失败", ex);
            return new VectorStoreConfig();
        }
    }
}
