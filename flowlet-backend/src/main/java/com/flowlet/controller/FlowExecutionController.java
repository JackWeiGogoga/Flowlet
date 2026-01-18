package com.flowlet.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flowlet.dto.DebugRequest;
import com.flowlet.dto.FlowExecutionVO;
import com.flowlet.dto.NodeDebugRequest;
import com.flowlet.dto.NodeDebugResult;
import com.flowlet.dto.ProcessRequest;
import com.flowlet.dto.Result;
import com.flowlet.entity.FlowExecution;
import com.flowlet.entity.NodeExecution;
import com.flowlet.mapper.FlowExecutionMapper;
import com.flowlet.mapper.NodeExecutionMapper;
import com.flowlet.service.FlowExecutionService;
import com.flowlet.service.NodeDebugService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 流程执行接口
 */
@RestController
@RequestMapping("/api/executions")
@RequiredArgsConstructor
public class FlowExecutionController {

    private final FlowExecutionService flowExecutionService;
    private final NodeDebugService nodeDebugService;
    private final FlowExecutionMapper flowExecutionMapper;
    private final NodeExecutionMapper nodeExecutionMapper;

    /**
     * 获取执行历史列表（包含流程名称）
     */
    @GetMapping
    public Result<Page<FlowExecutionVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String flowId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(defaultValue = "false") boolean includeDebug) {

        // 解析时间参数（支持 ISO 8601 格式）
        LocalDateTime startDateTime = parseDateTime(startTime);
        LocalDateTime endDateTime = parseDateTime(endTime);

        Page<FlowExecutionVO> pageParam = new Page<>(page, size);
        Page<FlowExecutionVO> result = flowExecutionMapper.selectPageWithFlowName(
                pageParam, projectId, flowId, status, startDateTime, endDateTime, includeDebug);
        return Result.success(result);
    }

    /**
     * 解析时间字符串为 LocalDateTime
     * 支持 ISO 8601 格式，如：2024-01-01T00:00:00.000Z
     * 会将 UTC 时间转换为服务器本地时间
     */
    private LocalDateTime parseDateTime(String timeStr) {
        if (timeStr == null || timeStr.isEmpty()) {
            return null;
        }
        try {
            // 处理 ISO 8601 UTC 格式（前端传的是 toISOString() 格式，以 Z 结尾表示 UTC）
            if (timeStr.endsWith("Z")) {
                // 解析为 Instant（UTC时间点），然后转换为系统默认时区的 LocalDateTime
                Instant instant = Instant.parse(timeStr);
                return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
            }
            
            // 非 UTC 格式，直接解析
            // 移除毫秒部分的多余精度
            if (timeStr.contains(".")) {
                int dotIndex = timeStr.indexOf('.');
                String beforeDot = timeStr.substring(0, dotIndex);
                String afterDot = timeStr.substring(dotIndex + 1);
                // 只保留3位毫秒
                if (afterDot.length() > 3) {
                    afterDot = afterDot.substring(0, 3);
                }
                timeStr = beforeDot + "." + afterDot;
                return LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"));
            }
            return LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        } catch (Exception e) {
            try {
                // 尝试不带毫秒的格式
                return LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
            } catch (Exception e2) {
                return null;
            }
        }
    }

    /**
     * 执行流程（需要已发布的流程）
     */
    @PostMapping
    public Result<FlowExecution> execute(@Valid @RequestBody ProcessRequest request) {
        FlowExecution execution = flowExecutionService.execute(request);
        return Result.success(execution);
    }

    /**
     * 调试执行流程（直接使用传入的流程图数据，无需发布）
     */
    @PostMapping("/debug")
    public Result<FlowExecution> debug(@Valid @RequestBody DebugRequest request) {
        FlowExecution execution = flowExecutionService.debug(request);
        return Result.success(execution);
    }

    /**
     * 获取执行实例详情
     */
    @GetMapping("/{id}")
    public Result<FlowExecution> getById(@PathVariable String id) {
        FlowExecution execution = flowExecutionService.getExecution(id);
        if (execution == null) {
            return Result.error(404, "执行实例不存在");
        }
        return Result.success(execution);
    }

    /**
     * 获取执行实例的节点执行记录
     */
    @GetMapping("/{id}/nodes")
    public Result<List<NodeExecution>> getNodeExecutions(@PathVariable String id) {
        LambdaQueryWrapper<NodeExecution> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(NodeExecution::getExecutionId, id)
                .orderByAsc(NodeExecution::getCreatedAt);
        List<NodeExecution> nodes = nodeExecutionMapper.selectList(wrapper);
        return Result.success(nodes);
    }

    /**
     * 处理异步回调
     */
    @PostMapping("/callback/{callbackKey}")
    public Result<Void> handleCallback(@PathVariable String callbackKey,
                                        @RequestBody Map<String, Object> callbackData) {
        flowExecutionService.handleCallback(callbackKey, callbackData);
        return Result.success();
    }

    /**
     * 手动恢复暂停的执行
     */
    @PostMapping("/{id}/resume")
    public Result<Void> resumeExecution(@PathVariable String id) {
        flowExecutionService.resumeExecution(id);
        return Result.success();
    }

    /**
     * 调试执行单个节点
     * 用于在配置节点时快速测试节点行为
     */
    @PostMapping("/debug-node")
    public Result<NodeDebugResult> debugNode(@Valid @RequestBody NodeDebugRequest request) {
        NodeDebugResult result = nodeDebugService.debugNode(request);
        return Result.success(result);
    }
}
