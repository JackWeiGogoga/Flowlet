package com.flowlet.dto.model;

import lombok.Data;

@Data
public class StandardProviderModelRefreshRequest {
    private String baseUrl;
    private String apiKey;
}
