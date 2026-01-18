package com.flowlet.dto.vectorstore;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VectorStoreProviderResponse {
    private String id;
    private String name;
    private String providerKey;
    private String baseUrl;
    private String database;
    private String grpcUrl;
    private Boolean preferGrpc;
    private boolean hasKey;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
