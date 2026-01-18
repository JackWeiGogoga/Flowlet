package com.flowlet.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.enumeration.EnumDefinitionRequest;
import com.flowlet.dto.enumeration.EnumDefinitionResponse;
import com.flowlet.dto.enumeration.EnumValueDTO;
import com.flowlet.entity.EnumDefinition;
import com.flowlet.mapper.EnumDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 枚举定义服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnumDefinitionService {

    private final EnumDefinitionMapper enumDefinitionMapper;
    private final ObjectMapper objectMapper;

    /**
     * 创建枚举
     */
    @Transactional
    public EnumDefinitionResponse create(String projectId, EnumDefinitionRequest request, String userId) {
        int count = enumDefinitionMapper.countByName(projectId, request.getName(), null);
        if (count > 0) {
            throw new IllegalArgumentException("同一项目内已存在名为 '" + request.getName() + "' 的枚举");
        }

        EnumDefinition entity = new EnumDefinition();
        entity.setProjectId(projectId);
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setValuesJson(serializeValues(request.getValues()));
        entity.setCreatedBy(userId);

        enumDefinitionMapper.insert(entity);
        log.info("创建枚举: projectId={}, name={}", projectId, request.getName());

        return toResponse(entity);
    }

    /**
     * 更新枚举
     */
    @Transactional
    public EnumDefinitionResponse update(String id, EnumDefinitionRequest request, String projectId) {
        EnumDefinition entity = enumDefinitionMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("枚举不存在: " + id);
        }

        int count = enumDefinitionMapper.countByName(projectId, request.getName(), id);
        if (count > 0) {
            throw new IllegalArgumentException("同一项目内已存在名为 '" + request.getName() + "' 的枚举");
        }

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setValuesJson(serializeValues(request.getValues()));

        enumDefinitionMapper.updateById(entity);
        log.info("更新枚举: id={}, name={}", id, request.getName());

        return toResponse(entity);
    }

    /**
     * 删除枚举
     */
    @Transactional
    public void delete(String id) {
        EnumDefinition entity = enumDefinitionMapper.selectById(id);
        if (entity == null) {
            return;
        }
        enumDefinitionMapper.deleteById(id);
        log.info("删除枚举: id={}, name={}", id, entity.getName());
    }

    /**
     * 获取枚举详情
     */
    public EnumDefinitionResponse getById(String id) {
        EnumDefinition entity = enumDefinitionMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("枚举不存在: " + id);
        }
        return toResponse(entity);
    }

    /**
     * 获取项目下枚举列表
     */
    public List<EnumDefinitionResponse> listByProject(String projectId) {
        return enumDefinitionMapper.selectByProject(projectId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private String serializeValues(List<EnumValueDTO> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? Collections.emptyList() : values);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("枚举值序列化失败: " + e.getMessage());
        }
    }

    private List<EnumValueDTO> deserializeValues(String valuesJson) {
        if (valuesJson == null || valuesJson.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(valuesJson, new TypeReference<List<EnumValueDTO>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("枚举值解析失败: " + e.getMessage());
        }
    }

    private EnumDefinitionResponse toResponse(EnumDefinition entity) {
        EnumDefinitionResponse response = new EnumDefinitionResponse();
        response.setId(entity.getId());
        response.setProjectId(entity.getProjectId());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setValues(deserializeValues(entity.getValuesJson()));
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
