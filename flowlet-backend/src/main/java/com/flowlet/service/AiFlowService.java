package com.flowlet.service;

import com.flowlet.dto.ai.AiFlowMessageRequest;
import com.flowlet.dto.ai.AiFlowMessageResponse;
import com.flowlet.dto.ai.AiFlowRegenerateRequest;
import com.flowlet.dto.ai.AiFlowSessionDetail;
import com.flowlet.dto.ai.AiFlowSessionRequest;
import com.flowlet.dto.ai.AiFlowSessionResponse;

public interface AiFlowService {

    AiFlowSessionResponse createSession(AiFlowSessionRequest request);

    AiFlowSessionDetail getSessionDetail(String sessionId);

    AiFlowMessageResponse sendMessage(String sessionId, AiFlowMessageRequest request);

    AiFlowMessageResponse regenerateLastMessage(String sessionId, AiFlowRegenerateRequest request);
}
