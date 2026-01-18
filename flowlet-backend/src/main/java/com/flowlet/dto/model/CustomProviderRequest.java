package com.flowlet.dto.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CustomProviderRequest {
    @NotBlank(message = "名称不能为空")
    private String name;

    @NotBlank(message = "Base URL 不能为空")
    private String baseUrl;

    private String apiKey;

    private String model;

    /**
     * 多模型列表
     */
    private List<String> models;

    /**
     * 清除已保存的 API Key
     */
    private Boolean clearKey = false;

    /**
     * 是否启用
     */
    private Boolean enabled = true;
}
