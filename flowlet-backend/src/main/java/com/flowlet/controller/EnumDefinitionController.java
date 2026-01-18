package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.enumeration.EnumDefinitionRequest;
import com.flowlet.dto.enumeration.EnumDefinitionResponse;
import com.flowlet.service.EnumDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * 枚举定义控制器
 */
@RestController
@RequestMapping("/api/projects/{projectId}/enums")
@RequiredArgsConstructor
public class EnumDefinitionController {

    private final EnumDefinitionService enumDefinitionService;

    /**
     * 创建枚举
     */
    @PostMapping
    public Result<EnumDefinitionResponse> create(
            @PathVariable String projectId,
            @RequestBody EnumDefinitionRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        EnumDefinitionResponse response = enumDefinitionService.create(projectId, request, userId);
        return Result.success(response);
    }

    /**
     * 更新枚举
     */
    @PutMapping("/{id}")
    public Result<EnumDefinitionResponse> update(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody EnumDefinitionRequest request) {
        EnumDefinitionResponse response = enumDefinitionService.update(id, request, projectId);
        return Result.success(response);
    }

    /**
     * 删除枚举
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String projectId, @PathVariable String id) {
        enumDefinitionService.delete(id);
        return Result.success(null);
    }

    /**
     * 获取单个枚举
     */
    @GetMapping("/{id}")
    public Result<EnumDefinitionResponse> getById(@PathVariable String projectId, @PathVariable String id) {
        EnumDefinitionResponse response = enumDefinitionService.getById(id);
        return Result.success(response);
    }

    /**
     * 获取项目下枚举列表
     */
    @GetMapping
    public Result<List<EnumDefinitionResponse>> listByProject(@PathVariable String projectId) {
        List<EnumDefinitionResponse> list = enumDefinitionService.listByProject(projectId);
        return Result.success(list);
    }
}
