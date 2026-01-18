package com.flowlet.dto.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiFlowSessionDetail {

    private AiFlowSessionResponse session;

    private String currentDsl;

    private List<AiFlowMessageRecord> messages;
}
