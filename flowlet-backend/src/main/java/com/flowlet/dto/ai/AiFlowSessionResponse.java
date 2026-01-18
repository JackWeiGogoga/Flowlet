package com.flowlet.dto.ai;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AiFlowSessionResponse {

    private String id;

    private String projectId;

    private String flowId;

    private String providerType;

    private String providerKey;

    private String providerId;

    private String model;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
