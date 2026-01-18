package com.flowlet.dto.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class UpsertStandardProviderRequest {
    @NotBlank(message = "Base URL 不能为空")
    private String baseUrl;

    private String apiKey;

    private String defaultModel;

    /**
     * 可用模型列表（用于快速选择）
     */
    private List<String> models;

    private Boolean enabled = true;

    /**
     * 清除已保存的 API Key
     */
    private Boolean clearKey = false;
}
