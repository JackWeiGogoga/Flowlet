package com.flowlet.dto.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelProviderTestRequest {
    @NotBlank(message = "providerType 不能为空")
    private String providerType;

    private String providerKey;

    private String providerId;

    @NotBlank(message = "Base URL 不能为空")
    private String baseUrl;

    private String apiKey;

    private String model;
}
