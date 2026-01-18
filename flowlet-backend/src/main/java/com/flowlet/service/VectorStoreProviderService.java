package com.flowlet.service;

import com.flowlet.dto.vectorstore.VectorStoreProviderRequest;
import com.flowlet.dto.vectorstore.VectorStoreProviderResponse;

import java.util.List;

public interface VectorStoreProviderService {
    List<VectorStoreProviderResponse> listProviders();

    VectorStoreProviderResponse createProvider(VectorStoreProviderRequest request);

    VectorStoreProviderResponse updateProvider(String id, VectorStoreProviderRequest request);

    void deleteProvider(String id);

    VectorStoreProviderResponse toggleProvider(String id, boolean enabled);
}
