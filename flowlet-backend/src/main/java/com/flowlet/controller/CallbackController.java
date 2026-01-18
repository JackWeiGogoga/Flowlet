package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.entity.AsyncCallback;
import com.flowlet.mapper.AsyncCallbackMapper;
import com.flowlet.service.FlowExecutionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 异步回调接口
 * 用于外部系统处理完成后通知 Flowlet 继续执行流程
 */
@Slf4j
@RestController
@RequestMapping("/api/callback")
@RequiredArgsConstructor
public class CallbackController {

    private final FlowExecutionService flowExecutionService;
    private final AsyncCallbackMapper asyncCallbackMapper;

    /**
     * 回调请求体
     */
    @Data
    public static class CallbackRequest {
        /**
         * 是否成功
         */
        private boolean success = true;

        /**
         * 回调数据
         */
        private Map<String, Object> data;

        /**
         * 错误信息（失败时）
         */
        private String errorMessage;
    }

    /**
     * 回调响应
     */
    @Data
    public static class CallbackResponse {
        private String executionId;
        private String nodeId;
        private String status;
        private String message;

        public static CallbackResponse success(String executionId, String nodeId) {
            CallbackResponse response = new CallbackResponse();
            response.setExecutionId(executionId);
            response.setNodeId(nodeId);
            response.setStatus("accepted");
            response.setMessage("回调已接收，流程继续执行");
            return response;
        }

        public static CallbackResponse error(String message) {
            CallbackResponse response = new CallbackResponse();
            response.setStatus("error");
            response.setMessage(message);
            return response;
        }
    }

    /**
     * 处理异步回调
     * 外部系统通过此接口通知 Flowlet 任务处理结果
     * 
     * POST /api/callback/{callbackKey}
     * Body: {"success": true, "data": {...}}
     */
    @PostMapping("/{callbackKey}")
    public Result<CallbackResponse> handleCallback(
            @PathVariable String callbackKey,
            @RequestBody CallbackRequest request) {

        log.info("收到 HTTP 回调: callbackKey={}, success={}", callbackKey, request.isSuccess());

        try {
            // 查询回调记录
            AsyncCallback callback = asyncCallbackMapper.findByCallbackKey(callbackKey);
            if (callback == null) {
                log.warn("回调记录不存在: {}", callbackKey);
                return Result.error(404, "回调记录不存在或已过期");
            }

            if (!"waiting".equals(callback.getStatus())) {
                log.warn("回调已处理过: callbackKey={}, status={}", callbackKey, callback.getStatus());
                return Result.error(400, "回调已处理过，状态: " + callback.getStatus());
            }

            // 构建回调数据
            Map<String, Object> callbackData = request.getData();
            if (callbackData == null) {
                callbackData = Map.of();
            }

            // 添加成功/失败标识
            callbackData = new java.util.HashMap<>(callbackData);
            callbackData.put("success", request.isSuccess());
            if (!request.isSuccess() && request.getErrorMessage() != null) {
                callbackData.put("errorMessage", request.getErrorMessage());
            }

            // 处理回调
            flowExecutionService.handleCallback(callbackKey, callbackData);

            log.info("回调处理成功: callbackKey={}, executionId={}", 
                    callbackKey, callback.getExecutionId());

            return Result.success(CallbackResponse.success(
                    callback.getExecutionId(), 
                    callback.getNodeExecutionId()));

        } catch (Exception e) {
            log.error("处理回调失败: callbackKey={}, error={}", callbackKey, e.getMessage(), e);
            return Result.error(500, "处理回调失败: " + e.getMessage());
        }
    }

    /**
     * 查询回调状态
     * GET /api/callback/{callbackKey}/status
     */
    @GetMapping("/{callbackKey}/status")
    public Result<AsyncCallback> getCallbackStatus(@PathVariable String callbackKey) {

        AsyncCallback callback = asyncCallbackMapper.findByCallbackKey(callbackKey);
        if (callback == null) {
            return Result.error(404, "回调记录不存在");
        }

        return Result.success(callback);
    }

    /**
     * 简化回调接口 - 仅传递数据
     * 适用于简单场景，默认为成功
     * POST /api/callback/{callbackKey}/simple
     */
    @PostMapping("/{callbackKey}/simple")
    public Result<CallbackResponse> simpleCallback(
            @PathVariable String callbackKey,
            @RequestBody(required = false) Map<String, Object> data) {

        CallbackRequest request = new CallbackRequest();
        request.setSuccess(true);
        request.setData(data);

        return handleCallback(callbackKey, request);
    }

    /**
     * 标记回调失败
     * POST /api/callback/{callbackKey}/fail
     */
    @PostMapping("/{callbackKey}/fail")
    public Result<CallbackResponse> failCallback(
            @PathVariable String callbackKey,
            @RequestParam(required = false) String errorMessage) {

        CallbackRequest request = new CallbackRequest();
        request.setSuccess(false);
        request.setErrorMessage(errorMessage != null ? errorMessage : "外部系统处理失败");

        return handleCallback(callbackKey, request);
    }
}
