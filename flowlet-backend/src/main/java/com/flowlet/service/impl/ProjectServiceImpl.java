package com.flowlet.service.impl;

import com.flowlet.entity.Project;
import com.flowlet.entity.ProjectMember;
import com.flowlet.exception.AccessDeniedException;
import com.flowlet.exception.BusinessException;
import com.flowlet.exception.ResourceNotFoundException;
import com.flowlet.mapper.ProjectMapper;
import com.flowlet.mapper.ProjectMemberMapper;
import com.flowlet.service.ProjectAccessService;
import com.flowlet.service.ProjectService;
import com.flowlet.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 项目服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final ProjectAccessService projectAccessService;

    @Override
    @Transactional
    public Project create(String name, String description) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        // 创建项目
        Project project = new Project();
        project.setId(UUID.randomUUID().toString());
        project.setName(name);
        project.setDescription(description);
        project.setCreatedBy(currentUserId);
        project.setOwnerId(currentUserId);
        project.setCreatedAt(LocalDateTime.now());
        project.setUpdatedAt(LocalDateTime.now());
        
        projectMapper.insert(project);
        log.info("Created project: {} by user: {}", project.getId(), currentUserId);
        
        // 将创建者添加为 owner 成员
        ProjectMember ownerMember = new ProjectMember();
        ownerMember.setId(UUID.randomUUID().toString());
        ownerMember.setProjectId(project.getId());
        ownerMember.setUserId(currentUserId);
        ownerMember.setRole(ProjectMember.Role.OWNER.getValue());
        ownerMember.setCreatedAt(LocalDateTime.now());
        ownerMember.setUpdatedAt(LocalDateTime.now());
        
        projectMemberMapper.insert(ownerMember);
        log.info("Added owner member to project: {}", project.getId());
        
        return project;
    }

    @Override
    public Project getById(String projectId) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查访问权限
        if (!projectAccessService.hasAccess(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have access to this project");
        }
        
        return project;
    }

    @Override
    public List<Project> listMyProjects() {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        return projectMapper.selectByUserId(currentUserId);
    }

    @Override
    @Transactional
    public Project update(String projectId, String name, String description) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查编辑权限
        if (!projectAccessService.canEdit(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have permission to edit this project");
        }
        
        // 更新项目信息
        if (name != null && !name.isBlank()) {
            project.setName(name);
        }
        if (description != null) {
            project.setDescription(description);
        }
        project.setUpdatedAt(LocalDateTime.now());
        
        projectMapper.updateById(project);
        log.info("Updated project: {} by user: {}", projectId, currentUserId);
        
        return project;
    }

    @Override
    @Transactional
    public void delete(String projectId) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 默认项目不可删除
        if (Boolean.TRUE.equals(project.getIsDefault())) {
            throw new BusinessException("默认项目不可删除");
        }
        
        // 只有 owner 可以删除项目
        ProjectMember.Role userRole = projectAccessService.getUserRole(projectId, currentUserId);
        if (userRole == null || !userRole.isOwner()) {
            throw new AccessDeniedException("Only the project owner can delete the project");
        }
        
        // 删除所有项目成员
        projectMemberMapper.deleteByProjectId(projectId);
        
        // 删除项目
        projectMapper.deleteById(projectId);
        log.info("Deleted project: {} by user: {}", projectId, currentUserId);
    }

    @Override
    @Transactional
    public ProjectMember addMember(String projectId, String userId, String role) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        // 检查项目是否存在
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查管理权限
        if (!projectAccessService.canManage(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have permission to manage project members");
        }
        
        // 检查用户是否已经是成员
        if (projectMemberMapper.existsByProjectAndUser(projectId, userId)) {
            throw new BusinessException("User is already a member of this project");
        }
        
        // 验证角色
        ProjectMember.Role memberRole;
        try {
            memberRole = ProjectMember.Role.fromValue(role);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid role: " + role);
        }
        
        // 不允许添加新的 owner
        if (memberRole == ProjectMember.Role.OWNER) {
            throw new BusinessException("Cannot add another owner to the project");
        }
        
        // 创建成员
        ProjectMember member = new ProjectMember();
        member.setId(UUID.randomUUID().toString());
        member.setProjectId(projectId);
        member.setUserId(userId);
        member.setRole(memberRole.getValue());
        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());
        
        projectMemberMapper.insert(member);
        log.info("Added member {} to project {} with role {}", userId, projectId, role);
        
        return member;
    }

    @Override
    @Transactional
    public void removeMember(String projectId, String userId) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        // 检查项目是否存在
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查管理权限
        if (!projectAccessService.canManage(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have permission to manage project members");
        }
        
        // 获取成员信息
        ProjectMember member = projectMemberMapper.selectByProjectAndUser(projectId, userId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found in project");
        }
        
        // 不允许移除 owner
        if (ProjectMember.Role.OWNER.getValue().equals(member.getRole())) {
            throw new BusinessException("Cannot remove the project owner");
        }
        
        // 删除成员
        projectMemberMapper.deleteById(member.getId());
        log.info("Removed member {} from project {}", userId, projectId);
    }

    @Override
    @Transactional
    public ProjectMember updateMemberRole(String projectId, String userId, String role) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        // 检查项目是否存在
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查管理权限
        if (!projectAccessService.canManage(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have permission to manage project members");
        }
        
        // 获取成员信息
        ProjectMember member = projectMemberMapper.selectByProjectAndUser(projectId, userId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found in project");
        }
        
        // 验证角色
        ProjectMember.Role newRole;
        try {
            newRole = ProjectMember.Role.fromValue(role);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid role: " + role);
        }
        
        // 不允许更改 owner 的角色
        if (ProjectMember.Role.OWNER.getValue().equals(member.getRole())) {
            throw new BusinessException("Cannot change the owner's role");
        }
        
        // 不允许设置为 owner
        if (newRole == ProjectMember.Role.OWNER) {
            throw new BusinessException("Cannot set member as owner");
        }
        
        // 更新角色
        member.setRole(newRole.getValue());
        member.setUpdatedAt(LocalDateTime.now());
        projectMemberMapper.updateById(member);
        
        log.info("Updated member {} role to {} in project {}", userId, role, projectId);
        
        return member;
    }

    @Override
    public List<ProjectMember> listMembers(String projectId) {
        String currentUserId = SecurityUtils.requireCurrentUserId();
        
        // 检查项目是否存在
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        
        // 检查访问权限
        if (!projectAccessService.hasAccess(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have access to this project");
        }
        
        return projectMemberMapper.selectByProjectId(projectId);
    }

    @Override
    public boolean hasAccess(String projectId, String userId) {
        return projectAccessService.hasAccess(projectId, userId);
    }

    @Override
    public boolean canEdit(String projectId, String userId) {
        return projectAccessService.canEdit(projectId, userId);
    }

    @Override
    public boolean canManage(String projectId, String userId) {
        return projectAccessService.canManage(projectId, userId);
    }

    @Override
    public ProjectMember.Role getUserRole(String projectId, String userId) {
        return projectAccessService.getUserRole(projectId, userId);
    }
}
