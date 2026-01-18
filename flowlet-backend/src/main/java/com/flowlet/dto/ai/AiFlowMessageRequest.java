package com.flowlet.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiFlowMessageRequest {

    @NotBlank(message = "message 不能为空")
    private String message;

    /**
     * 当前流程 DSL（可选，优先于会话存储的 DSL）
     */
    private String currentDsl;

    private String providerType;

    private String providerKey;

    private String providerId;

    private String model;
}
