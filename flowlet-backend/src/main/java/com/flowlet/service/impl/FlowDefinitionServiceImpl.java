package com.flowlet.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.FlowDefinitionRequest;
import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowDependency;
import com.flowlet.entity.FlowDefinitionVersion;
import com.flowlet.enums.FlowStatus;
import com.flowlet.exception.AccessDeniedException;
import com.flowlet.exception.ResourceNotFoundException;
import com.flowlet.mapper.FlowDefinitionMapper;
import com.flowlet.mapper.FlowDefinitionVersionMapper;
import com.flowlet.mapper.FlowDependencyMapper;
import com.flowlet.mapper.ProjectMemberMapper;
import com.flowlet.service.FlowDefinitionService;
import com.flowlet.service.ProjectAccessService;
import com.flowlet.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 流程定义服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowDefinitionServiceImpl implements FlowDefinitionService {

    private final FlowDefinitionMapper flowDefinitionMapper;
    private final FlowDefinitionVersionMapper flowDefinitionVersionMapper;
    private final FlowDependencyMapper flowDependencyMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public FlowDefinition create(String projectId, FlowDefinitionRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        
        // 如果指定了项目，检查编辑权限
        if (StrUtil.isNotBlank(projectId)) {
            if (!projectAccessService.canEdit(projectId, currentUserId)) {
                throw new AccessDeniedException("You don't have permission to create flows in this project");
            }
        }
        
        FlowDefinition flow = new FlowDefinition();
        flow.setName(request.getName());
        flow.setDescription(request.getDescription());
        flow.setInputSchema(request.getInputSchema());
        flow.setStatus(FlowStatus.DRAFT.getValue());
        flow.setVersion(0);
        flow.setProjectId(projectId);
        flow.setCreatedBy(currentUserId);
        flow.setCreatedByName(SecurityUtils.getCurrentUsername());
        flow.setCreatedAt(LocalDateTime.now());
        flow.setUpdatedAt(LocalDateTime.now());

        // 序列化流程图数据
        if (request.getGraphData() != null) {
            try {
                flow.setGraphData(objectMapper.writeValueAsString(request.getGraphData()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("序列化流程图数据失败", e);
            }
        }

        flowDefinitionMapper.insert(flow);
        log.info("创建流程定义成功: {}, projectId: {}, userId: {}", flow.getId(), projectId, currentUserId);
        return flow;
    }

    @Override
    @Transactional
    public FlowDefinition update(String id, FlowDefinitionRequest request) {
        FlowDefinition flow = flowDefinitionMapper.selectById(id);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", id);
        }
        
        // 检查编辑权限
        checkEditPermission(flow);

        flow.setName(request.getName());
        flow.setDescription(request.getDescription());
        flow.setInputSchema(request.getInputSchema());
        flow.setUpdatedAt(LocalDateTime.now());

        // 序列化流程图数据
        if (request.getGraphData() != null) {
            try {
                flow.setGraphData(objectMapper.writeValueAsString(request.getGraphData()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("序列化流程图数据失败", e);
            }
        }

        flowDefinitionMapper.updateById(flow);
        log.info("更新流程定义成功: {}", id);
        return flow;
    }

    @Override
    public FlowDefinition getById(String id) {
        FlowDefinition flow = flowDefinitionMapper.selectById(id);
        if (flow == null) {
            return null;
        }
        
        // 检查访问权限
        checkAccessPermission(flow);
        
        return flow;
    }

    @Override
    public Page<FlowDefinition> list(String projectId, int page, int size, String status, String keyword) {
        return list(projectId, page, size, status, keyword, null);
    }
    
    @Override
    public Page<FlowDefinition> list(String projectId, int page, int size, String status, String keyword, String createdByName) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Page<FlowDefinition> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<FlowDefinition> wrapper = new LambdaQueryWrapper<>();

        // 过滤掉 debug 状态的临时流程定义
        wrapper.ne(FlowDefinition::getStatus, FlowStatus.DEBUG.getValue());
        
        // 如果指定了项目ID，只查询该项目的流程
        if (StrUtil.isNotBlank(projectId)) {
            // 检查用户是否有该项目的访问权限
            if (currentUserId != null && !projectAccessService.hasAccess(projectId, currentUserId)) {
                throw new AccessDeniedException("You don't have access to this project");
            }
            wrapper.eq(FlowDefinition::getProjectId, projectId);
        } else if (currentUserId != null) {
            // 如果没有指定项目，查询用户有权限访问的所有项目的流程
            List<String> accessibleProjectIds = projectMemberMapper.selectProjectIdsByUserId(currentUserId);
            if (accessibleProjectIds != null && !accessibleProjectIds.isEmpty()) {
                wrapper.and(w -> w.in(FlowDefinition::getProjectId, accessibleProjectIds)
                        .or().isNull(FlowDefinition::getProjectId));
            } else {
                // 只能看到没有项目关联的流程
                wrapper.isNull(FlowDefinition::getProjectId);
            }
        }

        // 状态筛选
        if (StrUtil.isNotBlank(status)) {
            wrapper.eq(FlowDefinition::getStatus, status);
        }

        // 关键词搜索（名称、描述、创建者用户名）
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(FlowDefinition::getName, keyword)
                    .or()
                    .like(FlowDefinition::getDescription, keyword)
                    .or()
                    .like(FlowDefinition::getCreatedByName, keyword));
        }
        
        // 创建者用户名筛选
        if (StrUtil.isNotBlank(createdByName)) {
            wrapper.eq(FlowDefinition::getCreatedByName, createdByName);
        }

        wrapper.orderByDesc(FlowDefinition::getUpdatedAt);
        return flowDefinitionMapper.selectPage(pageParam, wrapper);
    }

    @Override
    @Transactional
    public void delete(String id) {
        FlowDefinition flow = flowDefinitionMapper.selectById(id);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", id);
        }
        
        // 检查编辑权限
        checkEditPermission(flow);
        
        flowDefinitionMapper.deleteById(id);
        log.info("删除流程定义成功: {}", id);
    }

    @Override
    @Transactional
    public FlowDefinition publish(String id) {
        FlowDefinition flow = flowDefinitionMapper.selectById(id);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", id);
        }
        
        // 检查编辑权限
        checkEditPermission(flow);

        Integer nextVersion = getNextVersion(id);
        FlowDefinitionVersion version = new FlowDefinitionVersion();
        version.setFlowId(flow.getId());
        version.setVersion(nextVersion);
        version.setName(flow.getName());
        version.setDescription(flow.getDescription());
        version.setGraphData(flow.getGraphData());
        version.setInputSchema(flow.getInputSchema());
        version.setCreatedBy(SecurityUtils.getCurrentUserId());
        version.setCreatedByName(SecurityUtils.getCurrentUsername());
        version.setCreatedAt(LocalDateTime.now());
        flowDefinitionVersionMapper.insert(version);

        flow.setVersion(nextVersion);
        flow.setStatus(FlowStatus.PUBLISHED.getValue());
        flow.setUpdatedAt(LocalDateTime.now());
        flowDefinitionMapper.updateById(flow);

        log.info("发布流程定义成功: {}", id);
        return flow;
    }

    @Override
    @Transactional
    public FlowDefinition disable(String id) {
        FlowDefinition flow = flowDefinitionMapper.selectById(id);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", id);
        }
        
        // 检查编辑权限
        checkEditPermission(flow);

        flow.setStatus(FlowStatus.DISABLED.getValue());
        flow.setUpdatedAt(LocalDateTime.now());
        flowDefinitionMapper.updateById(flow);

        log.info("禁用流程定义成功: {}", id);
        return flow;
    }

    @Override
    @Transactional
    public FlowDefinition copy(String id) {
        FlowDefinition source = flowDefinitionMapper.selectById(id);
        if (source == null) {
            throw new ResourceNotFoundException("FlowDefinition", id);
        }
        
        // 检查访问权限（复制需要至少有访问权限）
        checkAccessPermission(source);
        
        String currentUserId = SecurityUtils.getCurrentUserId();

        // 创建新的流程定义
        FlowDefinition copy = new FlowDefinition();
        copy.setName(source.getName() + " - 副本");
        copy.setDescription(source.getDescription());
        copy.setInputSchema(source.getInputSchema());
        copy.setGraphData(source.getGraphData());
        copy.setStatus(FlowStatus.DRAFT.getValue());  // 复制后为草稿状态
        copy.setVersion(0);
        copy.setProjectId(source.getProjectId());  // 复制到同一项目
        copy.setCreatedBy(currentUserId);
        copy.setCreatedByName(SecurityUtils.getCurrentUsername());
        copy.setCreatedAt(LocalDateTime.now());
        copy.setUpdatedAt(LocalDateTime.now());

        flowDefinitionMapper.insert(copy);
        log.info("复制流程定义成功: {} -> {}", id, copy.getId());
        return copy;
    }

    @Override
    public List<FlowDefinitionVersion> listVersions(String flowId) {
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", flowId);
        }
        checkAccessPermission(flow);

        LambdaQueryWrapper<FlowDefinitionVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowDefinitionVersion::getFlowId, flowId)
                .orderByDesc(FlowDefinitionVersion::getVersion);
        return flowDefinitionVersionMapper.selectList(wrapper);
    }

    @Override
    public FlowDefinitionVersion getVersion(String flowId, Integer version) {
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", flowId);
        }
        checkAccessPermission(flow);

        LambdaQueryWrapper<FlowDefinitionVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowDefinitionVersion::getFlowId, flowId)
                .eq(FlowDefinitionVersion::getVersion, version);
        return flowDefinitionVersionMapper.selectOne(wrapper);
    }

    @Override
    @Transactional
    public FlowDefinition rollbackToVersion(String flowId, Integer version) {
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        if (flow == null) {
            throw new ResourceNotFoundException("FlowDefinition", flowId);
        }
        checkEditPermission(flow);

        FlowDefinitionVersion targetVersion = getVersion(flowId, version);
        if (targetVersion == null) {
            throw new ResourceNotFoundException("FlowDefinitionVersion", String.valueOf(version));
        }

        flow.setName(targetVersion.getName());
        flow.setDescription(targetVersion.getDescription());
        flow.setGraphData(targetVersion.getGraphData());
        flow.setInputSchema(targetVersion.getInputSchema());
        flow.setUpdatedAt(LocalDateTime.now());
        flowDefinitionMapper.updateById(flow);

        return flow;
    }

    @Override
    public FlowDefinition getPublishedFlow(String flowId, Integer version) {
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        if (flow == null) {
            return null;
        }
        checkAccessPermission(flow);
        if (FlowStatus.DISABLED.getValue().equals(flow.getStatus())) {
            throw new AccessDeniedException("流程已禁用，无法执行");
        }

        FlowDefinitionVersion resolvedVersion = resolveVersion(flowId, version);
        if (resolvedVersion == null) {
            return null;
        }

        FlowDefinition snapshot = new FlowDefinition();
        snapshot.setId(flow.getId());
        snapshot.setProjectId(flow.getProjectId());
        snapshot.setName(resolvedVersion.getName());
        snapshot.setDescription(resolvedVersion.getDescription());
        snapshot.setGraphData(resolvedVersion.getGraphData());
        snapshot.setInputSchema(resolvedVersion.getInputSchema());
        snapshot.setStatus(flow.getStatus());
        snapshot.setVersion(resolvedVersion.getVersion());
        snapshot.setIsReusable(flow.getIsReusable());
        snapshot.setCallCount(flow.getCallCount());
        snapshot.setCreatedBy(flow.getCreatedBy());
        snapshot.setCreatedAt(flow.getCreatedAt());
        snapshot.setUpdatedAt(flow.getUpdatedAt());
        return snapshot;
    }

    private Integer getNextVersion(String flowId) {
        FlowDefinitionVersion latest = resolveLatestVersion(flowId);
        return latest == null ? 1 : latest.getVersion() + 1;
    }

    private FlowDefinitionVersion resolveVersion(String flowId, Integer version) {
        if (version != null) {
            return getVersion(flowId, version);
        }
        return resolveLatestVersion(flowId);
    }

    private FlowDefinitionVersion resolveLatestVersion(String flowId) {
        LambdaQueryWrapper<FlowDefinitionVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowDefinitionVersion::getFlowId, flowId)
                .orderByDesc(FlowDefinitionVersion::getVersion)
                .last("LIMIT 1");
        return flowDefinitionVersionMapper.selectOne(wrapper);
    }

    @Override
    public Page<FlowDefinition> listReusable(int page, int size, String excludeFlowId) {
        Page<FlowDefinition> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<FlowDefinition> wrapper = new LambdaQueryWrapper<>();

        // 只查询已发布且标记为可复用的流程
        wrapper.eq(FlowDefinition::getStatus, FlowStatus.PUBLISHED.getValue())
               .eq(FlowDefinition::getIsReusable, true);

        // 排除指定流程（避免自己调用自己）
        if (StrUtil.isNotBlank(excludeFlowId)) {
            wrapper.ne(FlowDefinition::getId, excludeFlowId);
        }

        wrapper.orderByDesc(FlowDefinition::getCallCount)
               .orderByDesc(FlowDefinition::getUpdatedAt);

        return flowDefinitionMapper.selectPage(pageParam, wrapper);
    }

    @Override
    @Transactional
    public FlowDefinition setReusable(String id, Boolean isReusable) {
        FlowDefinition flow = getById(id);
        if (flow == null) {
            throw new RuntimeException("流程定义不存在: " + id);
        }

        flow.setIsReusable(isReusable);
        flow.setUpdatedAt(LocalDateTime.now());
        flowDefinitionMapper.updateById(flow);

        log.info("设置流程可复用状态: id={}, isReusable={}", id, isReusable);
        return flow;
    }

    @Override
    public List<FlowDependency> getDependencies(String flowId) {
        LambdaQueryWrapper<FlowDependency> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowDependency::getFlowId, flowId);
        return flowDependencyMapper.selectList(wrapper);
    }

    @Override
    public List<FlowDefinition> getDependents(String flowId) {
        // 获取依赖该流程的所有流程ID
        List<String> dependentFlowIds = flowDependencyMapper.selectDependentByFlowIds(flowId);
        if (dependentFlowIds == null || dependentFlowIds.isEmpty()) {
            return Collections.emptyList();
        }

        // 查询这些流程的详细信息
        return flowDefinitionMapper.selectBatchIds(dependentFlowIds);
    }

    @Override
    public boolean wouldCauseCircularDependency(String flowId, String targetFlowId) {
        // 如果目标流程就是当前流程，直接返回 true
        if (flowId.equals(targetFlowId)) {
            return true;
        }

        // 使用 DFS 检查目标流程的依赖中是否包含当前流程
        Set<String> visited = new HashSet<>();
        return checkCircularDependency(targetFlowId, flowId, visited);
    }

    /**
     * 递归检查循环依赖
     * @param currentFlowId 当前检查的流程ID
     * @param targetFlowId 目标流程ID（检查是否在依赖链中）
     * @param visited 已访问的流程ID集合
     * @return 是否存在循环依赖
     */
    private boolean checkCircularDependency(String currentFlowId, String targetFlowId, Set<String> visited) {
        if (currentFlowId.equals(targetFlowId)) {
            return true;
        }

        if (visited.contains(currentFlowId)) {
            return false;
        }
        visited.add(currentFlowId);

        // 获取当前流程依赖的所有流程
        List<String> dependencies = flowDependencyMapper.selectDependentFlowIds(currentFlowId);
        if (dependencies == null || dependencies.isEmpty()) {
            return false;
        }

        for (String depId : dependencies) {
            if (checkCircularDependency(depId, targetFlowId, visited)) {
                return true;
            }
        }

        return false;
    }

    @Override
    public Map<String, List<String>> getDependencyGraph() {
        Map<String, List<String>> graph = new HashMap<>();

        // 查询所有依赖关系
        LambdaQueryWrapper<FlowDependency> wrapper = new LambdaQueryWrapper<>();
        List<FlowDependency> allDependencies = flowDependencyMapper.selectList(wrapper);

        for (FlowDependency dep : allDependencies) {
            graph.computeIfAbsent(dep.getFlowId(), k -> new ArrayList<>())
                 .add(dep.getDependentFlowId());
        }

        return graph;
    }

    /**
     * 检查当前用户是否有访问流程的权限
     */
    private void checkAccessPermission(FlowDefinition flow) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return; // 未认证时跳过检查（由 Security 配置处理）
        }
        
        String projectId = flow.getProjectId();
        if (StrUtil.isBlank(projectId)) {
            return; // 没有关联项目的流程，暂时允许访问
        }
        
        if (!projectAccessService.hasAccess(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have access to this flow");
        }
    }
    
    /**
     * 检查当前用户是否有编辑流程的权限
     */
    private void checkEditPermission(FlowDefinition flow) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return; // 未认证时跳过检查（由 Security 配置处理）
        }
        
        String projectId = flow.getProjectId();
        if (StrUtil.isBlank(projectId)) {
            return; // 没有关联项目的流程，暂时允许编辑
        }
        
        if (!projectAccessService.canEdit(projectId, currentUserId)) {
            throw new AccessDeniedException("You don't have permission to edit this flow");
        }
    }

    /**
     * 更新流程定义时同步更新依赖关系
     */
    @Transactional
    public void updateDependencies(String flowId, String graphDataJson) {
        try {
            // 1. 删除旧的依赖关系
            LambdaQueryWrapper<FlowDependency> deleteWrapper = new LambdaQueryWrapper<>();
            deleteWrapper.eq(FlowDependency::getFlowId, flowId);
            flowDependencyMapper.delete(deleteWrapper);

            // 2. 解析流程图，提取子流程节点
            FlowGraphDTO graphData = objectMapper.readValue(graphDataJson, FlowGraphDTO.class);
            if (graphData.getNodes() == null) {
                return;
            }

            // 3. 找出所有子流程调用节点
            for (FlowGraphDTO.NodeDTO node : graphData.getNodes()) {
                if (node.getData() != null && "subflow".equals(node.getData().getNodeType())) {
                    Map<String, Object> config = node.getData().getConfig();
                    if (config != null && config.get("flowId") != null) {
                        String dependentFlowId = (String) config.get("flowId");

                        // 创建新的依赖关系
                        FlowDependency dependency = new FlowDependency();
                        dependency.setFlowId(flowId);
                        dependency.setDependentFlowId(dependentFlowId);
                        dependency.setNodeId(node.getId());
                        dependency.setCreatedAt(LocalDateTime.now());
                        flowDependencyMapper.insert(dependency);
                    }
                }
            }

            log.debug("更新流程依赖关系: flowId={}", flowId);
        } catch (Exception e) {
            log.warn("更新流程依赖关系失败: {}", e.getMessage());
        }
    }
}
