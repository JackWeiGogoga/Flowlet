package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.datastructure.*;
import com.flowlet.service.DataStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * 数据结构控制器
 */
@RestController
@RequestMapping("/api/projects/{projectId}/data-structures")
@RequiredArgsConstructor
public class DataStructureController {

    private final DataStructureService dataStructureService;

    /**
     * 创建数据结构
     */
    @PostMapping
    public Result<DataStructureResponse> create(
            @PathVariable String projectId,
            @RequestBody DataStructureRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        DataStructureResponse response = dataStructureService.create(projectId, request, userId);
        return Result.success(response);
    }

    /**
     * 更新数据结构
     */
    @PutMapping("/{id}")
    public Result<DataStructureResponse> update(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody DataStructureRequest request) {
        DataStructureResponse response = dataStructureService.update(id, request, projectId);
        return Result.success(response);
    }

    /**
     * 删除数据结构
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String projectId, @PathVariable String id) {
        dataStructureService.delete(id);
        return Result.success(null);
    }

    /**
     * 获取单个数据结构
     */
    @GetMapping("/{id}")
    public Result<DataStructureResponse> getById(@PathVariable String projectId, @PathVariable String id) {
        DataStructureResponse response = dataStructureService.getById(id);
        return Result.success(response);
    }

    /**
     * 获取项目级数据结构列表
     */
    @GetMapping("/project-level")
    public Result<List<DataStructureResponse>> getProjectLevelStructures(@PathVariable String projectId) {
        List<DataStructureResponse> list = dataStructureService.getProjectLevelStructures(projectId);
        return Result.success(list);
    }

    /**
     * 获取流程级数据结构列表
     */
    @GetMapping("/flow-level/{flowId}")
    public Result<List<DataStructureResponse>> getFlowLevelStructures(
            @PathVariable String projectId,
            @PathVariable String flowId) {
        List<DataStructureResponse> list = dataStructureService.getFlowLevelStructures(flowId);
        return Result.success(list);
    }

    /**
     * 获取项目下所有数据结构（按作用域分组）
     */
    @GetMapping("/grouped")
    public Result<Map<String, List<DataStructureResponse>>> getAllGrouped(@PathVariable String projectId) {
        Map<String, List<DataStructureResponse>> grouped = dataStructureService.getAllByProjectGrouped(projectId);
        return Result.success(grouped);
    }

    /**
     * 获取可用的数据结构列表（用于选择器）
     */
    @GetMapping("/available")
    public Result<List<DataStructureResponse>> getAvailable(
            @PathVariable String projectId,
            @RequestParam(required = false) String flowId) {
        List<DataStructureResponse> list = dataStructureService.getAvailableStructures(projectId, flowId);
        return Result.success(list);
    }

    /**
     * 从 JSON 样本生成数据结构
     */
    @PostMapping("/generate-from-json")
    public Result<DataStructureResponse> generateFromJson(
            @PathVariable String projectId,
            @RequestBody GenerateFromJsonRequest request,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        DataStructureResponse response = dataStructureService.generateFromJson(projectId, request, userId);
        return Result.success(response);
    }

    /**
     * 预览从 JSON 生成的字段定义（不保存）
     */
    @PostMapping("/preview-generate")
    public Result<List<FieldDefinitionDTO>> previewGenerate(@PathVariable String projectId, @RequestBody Map<String, String> body) {
        String jsonSample = body.get("jsonSample");
        List<FieldDefinitionDTO> fields = dataStructureService.previewGenerateFromJson(jsonSample);
        return Result.success(fields);
    }

    /**
     * 复制数据结构到另一个作用域
     */
    @PostMapping("/{id}/copy")
    public Result<DataStructureResponse> copyTo(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        String targetFlowId = body.get("targetFlowId");
        String newName = body.get("newName");
        DataStructureResponse response = dataStructureService.copyTo(id, targetFlowId, newName, userId);
        return Result.success(response);
    }

    /**
     * 将流程级结构提升为项目级
     */
    @PostMapping("/{id}/promote")
    public Result<DataStructureResponse> promoteToProjectLevel(
            @PathVariable String projectId,
            @PathVariable String id,
            Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        DataStructureResponse response = dataStructureService.promoteToProjectLevel(id, userId);
        return Result.success(response);
    }
}
