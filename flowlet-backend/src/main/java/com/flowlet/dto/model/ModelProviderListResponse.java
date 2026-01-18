package com.flowlet.dto.model;

import lombok.Data;

import java.util.List;

@Data
public class ModelProviderListResponse {
    private List<StandardProviderResponse> standardProviders;
    private List<CustomProviderResponse> customProviders;
}
