package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.ai.AiFlowMessageRequest;
import com.flowlet.dto.ai.AiFlowMessageResponse;
import com.flowlet.dto.ai.AiFlowRegenerateRequest;
import com.flowlet.dto.ai.AiFlowSessionDetail;
import com.flowlet.dto.ai.AiFlowSessionRequest;
import com.flowlet.dto.ai.AiFlowSessionResponse;
import com.flowlet.service.AiFlowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/flows")
@RequiredArgsConstructor
public class AiFlowController {

    private final AiFlowService aiFlowService;

    @PostMapping("/sessions")
    public Result<AiFlowSessionResponse> createSession(@Valid @RequestBody AiFlowSessionRequest request) {
        return Result.success(aiFlowService.createSession(request));
    }

    @GetMapping("/sessions/{sessionId}")
    public Result<AiFlowSessionDetail> getSession(@PathVariable String sessionId) {
        return Result.success(aiFlowService.getSessionDetail(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public Result<AiFlowMessageResponse> sendMessage(
            @PathVariable String sessionId,
            @Valid @RequestBody AiFlowMessageRequest request) {
        return Result.success(aiFlowService.sendMessage(sessionId, request));
    }

    @PostMapping("/sessions/{sessionId}/regenerate")
    public Result<AiFlowMessageResponse> regenerate(
            @PathVariable String sessionId,
            @RequestBody(required = false) AiFlowRegenerateRequest request) {
        return Result.success(aiFlowService.regenerateLastMessage(
                sessionId,
                request == null ? new AiFlowRegenerateRequest() : request
        ));
    }
}
