package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.constant.ConstantDefinitionRequest;
import com.flowlet.dto.constant.ConstantDefinitionResponse;
import com.flowlet.service.ConstantDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * 常量定义控制器
 */
@RestController
@RequestMapping("/api/projects/{projectId}/constants")
@RequiredArgsConstructor
public class ConstantDefinitionController {

    private final ConstantDefinitionService constantDefinitionService;

    /**
     * 创建常量
     */
    @PostMapping
    public Result<ConstantDefinitionResponse> create(
            @PathVariable String projectId,
            @RequestBody ConstantDefinitionRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        ConstantDefinitionResponse response = constantDefinitionService.create(projectId, request, userId);
        return Result.success(response);
    }

    /**
     * 更新常量
     */
    @PutMapping("/{id}")
    public Result<ConstantDefinitionResponse> update(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody ConstantDefinitionRequest request) {
        ConstantDefinitionResponse response = constantDefinitionService.update(id, request, projectId);
        return Result.success(response);
    }

    /**
     * 删除常量
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String projectId, @PathVariable String id) {
        constantDefinitionService.delete(id);
        return Result.success(null);
    }

    /**
     * 获取单个常量
     */
    @GetMapping("/{id}")
    public Result<ConstantDefinitionResponse> getById(@PathVariable String projectId, @PathVariable String id) {
        ConstantDefinitionResponse response = constantDefinitionService.getById(id);
        return Result.success(response);
    }

    /**
     * 获取项目级常量列表
     */
    @GetMapping("/project-level")
    public Result<List<ConstantDefinitionResponse>> getProjectLevel(@PathVariable String projectId) {
        List<ConstantDefinitionResponse> list = constantDefinitionService.getProjectLevelConstants(projectId);
        return Result.success(list);
    }

    /**
     * 获取流程级常量列表
     */
    @GetMapping("/flow-level/{flowId}")
    public Result<List<ConstantDefinitionResponse>> getFlowLevel(
            @PathVariable String projectId,
            @PathVariable String flowId) {
        List<ConstantDefinitionResponse> list = constantDefinitionService.getFlowLevelConstants(flowId);
        return Result.success(list);
    }

    /**
     * 获取项目下所有常量（按作用域分组）
     */
    @GetMapping("/grouped")
    public Result<Map<String, List<ConstantDefinitionResponse>>> getAllGrouped(@PathVariable String projectId) {
        Map<String, List<ConstantDefinitionResponse>> grouped =
                constantDefinitionService.getAllByProjectGrouped(projectId);
        return Result.success(grouped);
    }

    /**
     * 获取可用常量（项目级 + 当前流程级）
     */
    @GetMapping("/available")
    public Result<List<ConstantDefinitionResponse>> getAvailable(
            @PathVariable String projectId,
            @RequestParam(required = false) String flowId) {
        List<ConstantDefinitionResponse> list =
                constantDefinitionService.getAvailableConstants(projectId, flowId);
        return Result.success(list);
    }
}
