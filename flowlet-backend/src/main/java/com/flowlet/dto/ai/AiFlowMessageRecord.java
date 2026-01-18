package com.flowlet.dto.ai;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AiFlowMessageRecord {

    private String id;

    private String role;

    private String content;

    private String patchJson;

    private LocalDateTime createdAt;
}
