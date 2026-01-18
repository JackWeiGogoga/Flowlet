package com.flowlet.service;

import com.flowlet.entity.Project;
import com.flowlet.entity.ProjectMember;

import java.util.List;

/**
 * 项目服务接口
 */
public interface ProjectService {

    /**
     * 创建项目
     * 创建者自动成为 owner
     */
    Project create(String name, String description);

    /**
     * 获取项目详情
     */
    Project getById(String projectId);

    /**
     * 获取当前用户可见的项目列表
     */
    List<Project> listMyProjects();

    /**
     * 更新项目信息
     */
    Project update(String projectId, String name, String description);

    /**
     * 删除项目
     * 只有 owner 可以删除
     */
    void delete(String projectId);

    /**
     * 添加项目成员
     */
    ProjectMember addMember(String projectId, String userId, String role);

    /**
     * 移除项目成员
     */
    void removeMember(String projectId, String userId);

    /**
     * 更新成员角色
     */
    ProjectMember updateMemberRole(String projectId, String userId, String role);

    /**
     * 获取项目成员列表
     */
    List<ProjectMember> listMembers(String projectId);

    /**
     * 检查用户是否有项目访问权限
     */
    boolean hasAccess(String projectId, String userId);

    /**
     * 检查用户是否有项目编辑权限
     */
    boolean canEdit(String projectId, String userId);

    /**
     * 检查用户是否有项目管理权限
     */
    boolean canManage(String projectId, String userId);

    /**
     * 获取用户在项目中的角色
     */
    ProjectMember.Role getUserRole(String projectId, String userId);
}
