package com.flowlet.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flowlet.dto.FlowDefinitionRequest;
import com.flowlet.dto.Result;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowDependency;
import com.flowlet.entity.FlowDefinitionVersion;
import com.flowlet.service.FlowDefinitionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 流程定义接口
 */
@RestController
@RequestMapping("/api/flows")
@RequiredArgsConstructor
public class FlowDefinitionController {

    private final FlowDefinitionService flowDefinitionService;

    /**
     * 创建流程定义
     */
    @PostMapping
    public Result<FlowDefinition> create(
            @RequestParam(required = false) String projectId,
            @Valid @RequestBody FlowDefinitionRequest request) {
        FlowDefinition flow = flowDefinitionService.create(projectId, request);
        return Result.success(flow);
    }

    /**
     * 更新流程定义
     */
    @PutMapping("/{id}")
    public Result<FlowDefinition> update(@PathVariable String id,
                                          @Valid @RequestBody FlowDefinitionRequest request) {
        FlowDefinition flow = flowDefinitionService.update(id, request);
        return Result.success(flow);
    }

    /**
     * 获取流程定义详情
     */
    @GetMapping("/{id}")
    public Result<FlowDefinition> getById(@PathVariable String id) {
        FlowDefinition flow = flowDefinitionService.getById(id);
        if (flow == null) {
            return Result.error(404, "流程定义不存在");
        }
        return Result.success(flow);
    }

    /**
     * 分页查询流程定义
     */
    @GetMapping
    public Result<Page<FlowDefinition>> list(
            @RequestParam(required = false) String projectId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String createdByName) {
        Page<FlowDefinition> result = flowDefinitionService.list(projectId, page, size, status, keyword, createdByName);
        return Result.success(result);
    }

    /**
     * 删除流程定义
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        flowDefinitionService.delete(id);
        return Result.success();
    }

    /**
     * 发布流程
     */
    @PostMapping("/{id}/publish")
    public Result<FlowDefinition> publish(@PathVariable String id) {
        FlowDefinition flow = flowDefinitionService.publish(id);
        return Result.success(flow);
    }

    /**
     * 禁用流程
     */
    @PostMapping("/{id}/disable")
    public Result<FlowDefinition> disable(@PathVariable String id) {
        FlowDefinition flow = flowDefinitionService.disable(id);
        return Result.success(flow);
    }

    /**
     * 复制流程
     */
    @PostMapping("/{id}/copy")
    public Result<FlowDefinition> copy(@PathVariable String id) {
        FlowDefinition flow = flowDefinitionService.copy(id);
        return Result.success(flow);
    }

    // ==================== 子流程相关接口 ====================

    /**
     * 查询可复用的流程列表（用于子流程选择）
     */
    @GetMapping("/reusable")
    public Result<Page<FlowDefinition>> listReusable(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String excludeFlowId) {
        Page<FlowDefinition> result = flowDefinitionService.listReusable(page, size, excludeFlowId);
        return Result.success(result);
    }

    /**
     * 设置流程的可复用状态
     */
    @PostMapping("/{id}/reusable")
    public Result<FlowDefinition> setReusable(
            @PathVariable String id,
            @RequestParam Boolean isReusable) {
        FlowDefinition flow = flowDefinitionService.setReusable(id, isReusable);
        return Result.success(flow);
    }

    /**
     * 获取流程的依赖关系（该流程调用了哪些子流程）
     */
    @GetMapping("/{id}/dependencies")
    public Result<List<FlowDependency>> getDependencies(@PathVariable String id) {
        List<FlowDependency> dependencies = flowDefinitionService.getDependencies(id);
        return Result.success(dependencies);
    }

    /**
     * 获取依赖该流程的其他流程（哪些流程调用了此流程）
     */
    @GetMapping("/{id}/dependents")
    public Result<List<FlowDefinition>> getDependents(@PathVariable String id) {
        List<FlowDefinition> dependents = flowDefinitionService.getDependents(id);
        return Result.success(dependents);
    }

    /**
     * 检查是否会造成循环依赖
     */
    @GetMapping("/{id}/check-circular")
    public Result<Map<String, Object>> checkCircularDependency(
            @PathVariable String id,
            @RequestParam String targetFlowId) {
        boolean wouldCauseCircular = flowDefinitionService.wouldCauseCircularDependency(id, targetFlowId);
        return Result.success(Map.of(
            "wouldCauseCircular", wouldCauseCircular,
            "message", wouldCauseCircular ? "选择此流程将导致循环调用" : ""
        ));
    }

    /**
     * 获取整体依赖图
     */
    @GetMapping("/dependency-graph")
    public Result<Map<String, List<String>>> getDependencyGraph() {
        Map<String, List<String>> graph = flowDefinitionService.getDependencyGraph();
        return Result.success(graph);
    }

    // ==================== 版本管理接口 ====================

    /**
     * 获取流程版本列表
     */
    @GetMapping("/{id}/versions")
    public Result<List<FlowDefinitionVersion>> listVersions(@PathVariable String id) {
        return Result.success(flowDefinitionService.listVersions(id));
    }

    /**
     * 获取指定版本
     */
    @GetMapping("/{id}/versions/{version}")
    public Result<FlowDefinitionVersion> getVersion(@PathVariable String id,
                                                    @PathVariable Integer version) {
        FlowDefinitionVersion flowVersion = flowDefinitionService.getVersion(id, version);
        if (flowVersion == null) {
            return Result.error(404, "版本不存在");
        }
        return Result.success(flowVersion);
    }

    /**
     * 回退草稿到指定版本
     */
    @PostMapping("/{id}/versions/{version}/rollback")
    public Result<FlowDefinition> rollback(@PathVariable String id,
                                           @PathVariable Integer version) {
        FlowDefinition flow = flowDefinitionService.rollbackToVersion(id, version);
        return Result.success(flow);
    }
}
