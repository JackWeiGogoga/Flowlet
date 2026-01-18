package com.flowlet.dto.model;

import lombok.Data;

import java.util.List;

@Data
public class StandardProviderModelCatalogResponse {
    private List<StandardProviderModelItem> modelCatalog;
    private List<String> enabledModels;
}
