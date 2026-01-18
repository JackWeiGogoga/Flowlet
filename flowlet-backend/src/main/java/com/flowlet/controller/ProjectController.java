package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.project.AddMemberRequest;
import com.flowlet.dto.project.CreateProjectRequest;
import com.flowlet.dto.project.UpdateMemberRoleRequest;
import com.flowlet.dto.project.UpdateProjectRequest;
import com.flowlet.entity.Project;
import com.flowlet.entity.ProjectMember;
import com.flowlet.service.ProjectService;
import com.flowlet.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 项目管理 API
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * 创建项目
     * 创建新项目，创建者自动成为项目所有者
     */
    @PostMapping
    public Result<Project> createProject(@Valid @RequestBody CreateProjectRequest request) {
        Project project = projectService.create(request.getName(), request.getDescription());
        return Result.success(project);
    }

    /**
     * 获取项目列表
     * 获取当前用户可访问的所有项目
     */
    @GetMapping
    public Result<List<Project>> listProjects() {
        List<Project> projects = projectService.listMyProjects();
        return Result.success(projects);
    }

    /**
     * 获取项目详情
     */
    @GetMapping("/{projectId}")
    public Result<Project> getProject(@PathVariable String projectId) {
        Project project = projectService.getById(projectId);
        return Result.success(project);
    }

    /**
     * 更新项目
     * 更新项目名称和描述
     */
    @PutMapping("/{projectId}")
    public Result<Project> updateProject(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateProjectRequest request) {
        Project project = projectService.update(projectId, request.getName(), request.getDescription());
        return Result.success(project);
    }

    /**
     * 删除项目
     * 仅项目所有者可操作
     */
    @DeleteMapping("/{projectId}")
    public Result<Void> deleteProject(@PathVariable String projectId) {
        projectService.delete(projectId);
        return Result.success();
    }

    // ==================== 成员管理 ====================

    /**
     * 获取项目成员列表
     */
    @GetMapping("/{projectId}/members")
    public Result<List<ProjectMember>> listMembers(@PathVariable String projectId) {
        List<ProjectMember> members = projectService.listMembers(projectId);
        return Result.success(members);
    }

    /**
     * 添加项目成员
     */
    @PostMapping("/{projectId}/members")
    public Result<ProjectMember> addMember(
            @PathVariable String projectId,
            @Valid @RequestBody AddMemberRequest request) {
        ProjectMember member = projectService.addMember(projectId, request.getUserId(), request.getRole());
        return Result.success(member);
    }

    /**
     * 更新成员角色
     */
    @PutMapping("/{projectId}/members/{userId}")
    public Result<ProjectMember> updateMemberRole(
            @PathVariable String projectId,
            @PathVariable String userId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        ProjectMember member = projectService.updateMemberRole(projectId, userId, request.getRole());
        return Result.success(member);
    }

    /**
     * 移除项目成员
     */
    @DeleteMapping("/{projectId}/members/{userId}")
    public Result<Void> removeMember(
            @PathVariable String projectId,
            @PathVariable String userId) {
        projectService.removeMember(projectId, userId);
        return Result.success();
    }

    // ==================== 权限检查 ====================

    /**
     * 获取用户在项目中的权限
     * 获取当前用户在项目中的角色和权限信息
     */
    @GetMapping("/{projectId}/permissions")
    public Result<Map<String, Object>> getMyPermissions(@PathVariable String projectId) {
        // 调用 getById 会自动检查访问权限
        projectService.getById(projectId);
        
        ProjectMember.Role role = projectService.getUserRole(
                projectId, 
                SecurityUtils.requireCurrentUserId()
        );
        
        return Result.success(Map.of(
                "role", role != null ? role.getValue() : null,
                "canEdit", role != null && role.canEdit(),
                "canManage", role != null && role.canManage(),
                "isOwner", role != null && role.isOwner()
        ));
    }
}
