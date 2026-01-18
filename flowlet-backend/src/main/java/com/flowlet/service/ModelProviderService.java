package com.flowlet.service;

import com.flowlet.dto.model.CustomProviderRequest;
import com.flowlet.dto.model.CustomProviderResponse;
import com.flowlet.dto.model.ModelProviderListResponse;
import com.flowlet.dto.model.ModelProviderTestRequest;
import com.flowlet.dto.model.ModelProviderTestResponse;
import com.flowlet.dto.model.StandardProviderResponse;
import com.flowlet.dto.model.StandardProviderModelCatalogResponse;
import com.flowlet.dto.model.StandardProviderModelRefreshRequest;
import com.flowlet.dto.model.UpsertStandardProviderRequest;

public interface ModelProviderService {
    ModelProviderListResponse listProviders();

    StandardProviderResponse upsertStandard(String providerKey, UpsertStandardProviderRequest request);

    void deleteStandard(String providerKey);

    CustomProviderResponse createCustom(CustomProviderRequest request);

    CustomProviderResponse updateCustom(String id, CustomProviderRequest request);

    void deleteCustom(String id);

    ModelProviderTestResponse testConnection(ModelProviderTestRequest request);

    CustomProviderResponse toggleCustom(String id, boolean enabled);

    StandardProviderModelCatalogResponse refreshStandardModels(
            String providerKey,
            StandardProviderModelRefreshRequest request
    );
}
