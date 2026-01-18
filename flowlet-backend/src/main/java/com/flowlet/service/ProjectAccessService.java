package com.flowlet.service;

import com.flowlet.entity.ProjectMember;

/**
 * 项目权限检查服务接口
 * 独立出来避免循环依赖
 */
public interface ProjectAccessService {

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
