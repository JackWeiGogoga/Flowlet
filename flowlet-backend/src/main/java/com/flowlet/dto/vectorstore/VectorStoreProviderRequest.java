package com.flowlet.dto.vectorstore;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VectorStoreProviderRequest {

    @NotBlank(message = "名称不能为空")
    private String name;

    @NotBlank(message = "providerKey 不能为空")
    private String providerKey;

    @NotBlank(message = "Base URL 不能为空")
    private String baseUrl;

    private String apiKey;

    private String database;

    private String grpcUrl;

    private Boolean preferGrpc;

    private Boolean enabled;

    private Boolean clearKey;
}
