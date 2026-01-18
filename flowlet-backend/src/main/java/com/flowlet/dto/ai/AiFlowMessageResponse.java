package com.flowlet.dto.ai;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AiFlowMessageResponse {

    private String sessionId;

    private String messageId;

    private String role;

    private String content;

    private String patchJson;

    private String currentDsl;

    private LocalDateTime createdAt;
}
