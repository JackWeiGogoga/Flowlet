package com.flowlet.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flowlet.dto.FlowDefinitionRequest;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.FlowDependency;
import com.flowlet.entity.FlowDefinitionVersion;

import java.util.List;
import java.util.Map;

/**
 * 流程定义服务接口
 */
public interface FlowDefinitionService {

    /**
     * 创建流程定义（在指定项目下）
     */
    FlowDefinition create(String projectId, FlowDefinitionRequest request);

    /**
     * 创建流程定义（无项目）
     * @deprecated 建议使用 create(String projectId, FlowDefinitionRequest request)
     */
    @Deprecated
    default FlowDefinition create(FlowDefinitionRequest request) {
        return create(null, request);
    }

    /**
     * 更新流程定义
     */
    FlowDefinition update(String id, FlowDefinitionRequest request);

    /**
     * 根据ID获取流程定义
     */
    FlowDefinition getById(String id);

    /**
     * 分页查询流程定义（指定项目）
     *
     * @param projectId 项目ID
     * @param page 页码
     * @param size 每页数量
     * @param status 状态筛选
     * @param keyword 搜索关键词
     * @return 分页结果
     */
    Page<FlowDefinition> list(String projectId, int page, int size, String status, String keyword);
    
    /**
     * 分页查询流程定义（指定项目，支持按创建者筛选）
     *
     * @param projectId 项目ID
     * @param page 页码
     * @param size 每页数量
     * @param status 状态筛选
     * @param keyword 搜索关键词
     * @param createdByName 创建者用户名筛选
     * @return 分页结果
     */
    Page<FlowDefinition> list(String projectId, int page, int size, String status, String keyword, String createdByName);

    /**
     * 分页查询流程定义（所有用户可见的项目）
     *
     * @param page 页码
     * @param size 每页数量
     * @param status 状态筛选
     * @param keyword 搜索关键词
     * @return 分页结果
     */
    default Page<FlowDefinition> list(int page, int size, String status, String keyword) {
        return list(null, page, size, status, keyword);
    }

    /**
     * 删除流程定义
     */
    void delete(String id);

    /**
     * 发布流程
     */
    FlowDefinition publish(String id);

    /**
     * 禁用流程
     */
    FlowDefinition disable(String id);

    /**
     * 复制流程
     */
    FlowDefinition copy(String id);

    /**
     * 获取可复用的流程列表（公共流程）
     * @param page 页码
     * @param size 每页数量
     * @param excludeFlowId 排除的流程ID（用于避免循环调用）
     * @return 分页结果
     */
    Page<FlowDefinition> listReusable(int page, int size, String excludeFlowId);

    /**
     * 设置流程是否可复用
     * @param id 流程ID
     * @param isReusable 是否可复用
     * @return 更新后的流程
     */
    FlowDefinition setReusable(String id, Boolean isReusable);

    /**
     * 获取流程的依赖列表（该流程调用了哪些子流程）
     * @param flowId 流程ID
     * @return 依赖列表
     */
    List<FlowDependency> getDependencies(String flowId);

    /**
     * 获取依赖该流程的流程列表（哪些流程调用了该流程）
     * @param flowId 流程ID
     * @return 依赖该流程的流程列表
     */
    List<FlowDefinition> getDependents(String flowId);

    /**
     * 验证是否会造成循环依赖
     * @param flowId 当前流程ID
     * @param targetFlowId 目标子流程ID
     * @return 是否会造成循环
     */
    boolean wouldCauseCircularDependency(String flowId, String targetFlowId);

    /**
     * 获取所有流程的依赖关系图
     * @return key: 流程ID, value: 依赖的流程ID列表
     */
    Map<String, List<String>> getDependencyGraph();

    /**
     * 获取流程版本列表（按版本号倒序）
     */
    List<FlowDefinitionVersion> listVersions(String flowId);

    /**
     * 获取指定版本
     */
    FlowDefinitionVersion getVersion(String flowId, Integer version);

    /**
     * 回退草稿到指定版本
     */
    FlowDefinition rollbackToVersion(String flowId, Integer version);

    /**
     * 获取已发布版本的流程快照（用于执行/子流程调用）
     */
    FlowDefinition getPublishedFlow(String flowId, Integer version);
}
