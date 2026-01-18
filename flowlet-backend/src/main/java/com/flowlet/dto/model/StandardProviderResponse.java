package com.flowlet.dto.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class StandardProviderResponse {
    private String providerKey;
    private String baseUrl;
    private String defaultModel;
    private List<String> models;
    private List<StandardProviderModelItem> modelCatalog;
    private Boolean enabled;
    private Boolean hasKey;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
