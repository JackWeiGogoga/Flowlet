package com.flowlet.dto.ai;

import lombok.Data;

@Data
public class AiFlowRegenerateRequest {

    private String providerType;

    private String providerKey;

    private String providerId;

    private String model;

    /**
     * 当前流程 DSL（可选，优先于会话存储的 DSL）
     */
    private String currentDsl;
}
