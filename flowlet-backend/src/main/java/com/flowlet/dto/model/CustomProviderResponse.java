package com.flowlet.dto.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CustomProviderResponse {
    private String id;
    private String name;
    private String baseUrl;
    private String model;
    private List<String> models;
    private Boolean hasKey;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
