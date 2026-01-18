package com.flowlet.service.impl;

import com.flowlet.entity.Project;
import com.flowlet.entity.ProjectMember;
import com.flowlet.mapper.ProjectMapper;
import com.flowlet.mapper.ProjectMemberMapper;
import com.flowlet.service.UserService;
import com.flowlet.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 用户服务实现类
 * 处理用户首次登录时的初始化逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;

    /**
     * 默认项目名称模板
     */
    private static final String DEFAULT_PROJECT_NAME = "Default";
    private static final String DEFAULT_PROJECT_DESCRIPTION = "Default project";

    @Override
    @Transactional
    public Project ensureUserInitialized() {
        String userId = SecurityUtils.requireCurrentUserId();
        String username = SecurityUtils.getCurrentUsername();
        
        // 检查用户是否已有项目
        List<Project> existingProjects = projectMapper.selectByUserId(userId);
        
        if (!existingProjects.isEmpty()) {
            log.debug("User {} already has {} projects", userId, existingProjects.size());
            return existingProjects.get(0);
        }
        
        // 首次登录，创建默认项目
        log.info("First login for user {}, creating default project", userId);
        return createDefaultProjectInternal(userId, username);
    }

    @Override
    public Project getDefaultProject() {
        String userId = SecurityUtils.requireCurrentUserId();
        List<Project> projects = projectMapper.selectByUserId(userId);
        return projects.isEmpty() ? null : projects.get(0);
    }

    @Override
    @Transactional
    public Project createDefaultProject() {
        String userId = SecurityUtils.requireCurrentUserId();
        String username = SecurityUtils.getCurrentUsername();
        return createDefaultProjectInternal(userId, username);
    }

    @Override
    public boolean isUserInitialized() {
        String userId = SecurityUtils.requireCurrentUserId();
        List<Project> projects = projectMapper.selectByUserId(userId);
        return !projects.isEmpty();
    }

    /**
     * 内部方法：创建默认项目
     */
    private Project createDefaultProjectInternal(String userId, String username) {
        // 创建项目
        Project project = new Project();
        project.setId(UUID.randomUUID().toString());
        project.setName(DEFAULT_PROJECT_NAME);
        project.setDescription(DEFAULT_PROJECT_DESCRIPTION);
        project.setCreatedBy(userId);
        project.setOwnerId(userId);
        project.setIsDefault(true);
        project.setCreatedAt(LocalDateTime.now());
        project.setUpdatedAt(LocalDateTime.now());

        projectMapper.insert(project);
        log.info("Created default project {} for user {}", project.getId(), userId);

        // 将用户添加为 owner 成员
        ProjectMember ownerMember = new ProjectMember();
        ownerMember.setId(UUID.randomUUID().toString());
        ownerMember.setProjectId(project.getId());
        ownerMember.setUserId(userId);
        ownerMember.setRole(ProjectMember.Role.OWNER.getValue());
        ownerMember.setCreatedAt(LocalDateTime.now());
        ownerMember.setUpdatedAt(LocalDateTime.now());

        projectMemberMapper.insert(ownerMember);
        log.info("Added owner member to default project {}", project.getId());

        return project;
    }
}
