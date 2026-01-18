package com.flowlet.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiFlowSessionRequest {

    @NotBlank(message = "projectId 不能为空")
    private String projectId;

    private String flowId;

    private String providerType;

    private String providerKey;

    private String providerId;

    private String model;
}
