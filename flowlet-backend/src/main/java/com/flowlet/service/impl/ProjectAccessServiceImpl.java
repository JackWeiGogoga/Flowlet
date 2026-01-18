package com.flowlet.service.impl;

import com.flowlet.entity.ProjectMember;
import com.flowlet.mapper.ProjectMemberMapper;
import com.flowlet.service.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 项目权限检查服务实现
 * 独立出来避免循环依赖
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectAccessServiceImpl implements ProjectAccessService {

    private final ProjectMemberMapper projectMemberMapper;

    @Override
    public boolean hasAccess(String projectId, String userId) {
        if (projectId == null || userId == null) {
            return false;
        }
        return projectMemberMapper.existsByProjectAndUser(projectId, userId);
    }

    @Override
    public boolean canEdit(String projectId, String userId) {
        ProjectMember.Role role = getUserRole(projectId, userId);
        return role != null && role.canEdit();
    }

    @Override
    public boolean canManage(String projectId, String userId) {
        ProjectMember.Role role = getUserRole(projectId, userId);
        return role != null && role.canManage();
    }

    @Override
    public ProjectMember.Role getUserRole(String projectId, String userId) {
        if (projectId == null || userId == null) {
            return null;
        }
        ProjectMember member = projectMemberMapper.selectByProjectAndUser(projectId, userId);
        if (member == null) {
            return null;
        }
        try {
            return ProjectMember.Role.fromValue(member.getRole());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown role {} for user {} in project {}", member.getRole(), userId, projectId);
            return null;
        }
    }
}
