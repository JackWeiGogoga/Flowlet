package com.flowlet.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.constant.ConstantDefinitionRequest;
import com.flowlet.dto.constant.ConstantDefinitionResponse;
import com.flowlet.entity.ConstantDefinition;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.mapper.ConstantDefinitionMapper;
import com.flowlet.mapper.FlowDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 常量定义服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConstantDefinitionService {

    private final ConstantDefinitionMapper constantDefinitionMapper;
    private final FlowDefinitionMapper flowDefinitionMapper;
    private final ObjectMapper objectMapper;

    /**
     * 创建常量
     */
    @Transactional
    public ConstantDefinitionResponse create(
            String projectId,
            ConstantDefinitionRequest request,
            String userId
    ) {
        String normalizedFlowId = normalizeFlowId(request.getFlowId());
        int count = constantDefinitionMapper.countByName(
                projectId,
                normalizedFlowId,
                request.getName(),
                null
        );
        if (count > 0) {
            throw new IllegalArgumentException("同一作用域内已存在名为 '" + request.getName() + "' 的常量");
        }

        ConstantDefinition entity = new ConstantDefinition();
        entity.setProjectId(projectId);
        entity.setFlowId(normalizedFlowId);
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setValueType(resolveValueType(request.getValueType(), request.getValue()));
        entity.setValueJson(serializeValue(request.getValue()));
        entity.setCreatedBy(userId);

        constantDefinitionMapper.insert(entity);
        log.info("创建常量: projectId={}, flowId={}, name={}", projectId, normalizedFlowId, request.getName());

        return toResponse(entity);
    }

    /**
     * 更新常量
     */
    @Transactional
    public ConstantDefinitionResponse update(
            String id,
            ConstantDefinitionRequest request,
            String projectId
    ) {
        ConstantDefinition entity = constantDefinitionMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("常量不存在: " + id);
        }

        int count = constantDefinitionMapper.countByName(
                projectId,
                entity.getFlowId(),
                request.getName(),
                id
        );
        if (count > 0) {
            throw new IllegalArgumentException("同一作用域内已存在名为 '" + request.getName() + "' 的常量");
        }

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setValueType(resolveValueType(request.getValueType(), request.getValue()));
        entity.setValueJson(serializeValue(request.getValue()));

        constantDefinitionMapper.updateById(entity);
        log.info("更新常量: id={}, name={}", id, request.getName());

        return toResponse(entity);
    }

    /**
     * 删除常量
     */
    @Transactional
    public void delete(String id) {
        ConstantDefinition entity = constantDefinitionMapper.selectById(id);
        if (entity == null) {
            return;
        }
        constantDefinitionMapper.deleteById(id);
        log.info("删除常量: id={}, name={}", id, entity.getName());
    }

    /**
     * 获取常量详情
     */
    public ConstantDefinitionResponse getById(String id) {
        ConstantDefinition entity = constantDefinitionMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("常量不存在: " + id);
        }
        return toResponse(entity);
    }

    /**
     * 获取项目级常量列表
     */
    public List<ConstantDefinitionResponse> getProjectLevelConstants(String projectId) {
        return constantDefinitionMapper.selectProjectLevelConstants(projectId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 获取流程级常量列表
     */
    public List<ConstantDefinitionResponse> getFlowLevelConstants(String flowId) {
        return constantDefinitionMapper.selectFlowLevelConstants(flowId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 获取项目下所有常量（按作用域分组）
     */
    public Map<String, List<ConstantDefinitionResponse>> getAllByProjectGrouped(String projectId) {
        List<ConstantDefinition> entities = constantDefinitionMapper.selectAllByProject(projectId);
        Map<String, List<ConstantDefinitionResponse>> grouped = new LinkedHashMap<>();

        List<ConstantDefinitionResponse> projectLevel = entities.stream()
                .filter(ConstantDefinition::isProjectLevel)
                .map(this::toResponse)
                .collect(Collectors.toList());
        if (!projectLevel.isEmpty()) {
            grouped.put("global", projectLevel);
        }

        entities.stream()
                .filter(e -> !e.isProjectLevel())
                .collect(Collectors.groupingBy(ConstantDefinition::getFlowId))
                .forEach((flowId, list) -> {
                    List<ConstantDefinitionResponse> responses = list.stream()
                            .map(this::toResponse)
                            .collect(Collectors.toList());
                    String flowName = getFlowName(flowId);
                    grouped.put(flowName != null ? flowName : flowId, responses);
                });

        return grouped;
    }

    /**
     * 获取可用常量（项目级 + 当前流程级）
     */
    public List<ConstantDefinitionResponse> getAvailableConstants(String projectId, String flowId) {
        List<ConstantDefinitionResponse> projectLevel = getProjectLevelConstants(projectId);
        if (flowId == null || flowId.isEmpty()) {
            return projectLevel;
        }
        List<ConstantDefinitionResponse> flowLevel = getFlowLevelConstants(flowId);
        projectLevel.addAll(flowLevel);
        return projectLevel;
    }

    /**
     * 获取可用常量 Map（key 为常量名，流程级覆盖项目级）
     */
    public Map<String, Object> getAvailableConstantMap(String projectId, String flowId) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (ConstantDefinitionResponse response : getProjectLevelConstants(projectId)) {
            if (response.getName() != null) {
                result.put(response.getName(), response.getValue());
            }
        }
        if (flowId != null && !flowId.isEmpty()) {
            for (ConstantDefinitionResponse response : getFlowLevelConstants(flowId)) {
                if (response.getName() != null) {
                    result.put(response.getName(), response.getValue());
                }
            }
        }
        return result;
    }

    private ConstantDefinitionResponse toResponse(ConstantDefinition entity) {
        ConstantDefinitionResponse response = new ConstantDefinitionResponse();
        response.setId(entity.getId());
        response.setProjectId(entity.getProjectId());
        response.setFlowId(entity.getFlowId());
        response.setFlowName(getFlowName(entity.getFlowId()));
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setValueType(entity.getValueType());
        response.setValue(deserializeValue(entity.getValueJson()));
        response.setIsProjectLevel(entity.isProjectLevel());
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private String serializeValue(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("常量值序列化失败: " + e.getMessage());
        }
    }

    private Object deserializeValue(String valueJson) {
        if (valueJson == null || valueJson.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.readValue(valueJson, new TypeReference<Object>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("常量值解析失败: " + e.getMessage());
        }
    }

    private String resolveValueType(String valueType, Object value) {
        if (valueType != null && !valueType.isEmpty()) {
            return valueType;
        }
        if (value instanceof Number) {
            return "number";
        }
        if (value instanceof Boolean) {
            return "boolean";
        }
        if (value instanceof Map) {
            return "object";
        }
        if (value instanceof List) {
            return "array";
        }
        if (value == null) {
            return "string";
        }
        return "string";
    }

    private String normalizeFlowId(String flowId) {
        return (flowId != null && !flowId.isBlank()) ? flowId : null;
    }

    private String getFlowName(String flowId) {
        if (flowId == null) {
            return null;
        }
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        return flow != null ? flow.getName() : null;
    }
}
