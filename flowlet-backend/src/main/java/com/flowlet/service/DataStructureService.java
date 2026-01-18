package com.flowlet.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlet.dto.datastructure.*;
import com.flowlet.entity.DataStructure;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.mapper.DataStructureMapper;
import com.flowlet.mapper.FlowDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 数据结构服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataStructureService {

    private final DataStructureMapper dataStructureMapper;
    private final FlowDefinitionMapper flowDefinitionMapper;
    private final ObjectMapper objectMapper;

    /**
     * 创建数据结构
     */
    @Transactional
    public DataStructureResponse create(String projectId, DataStructureRequest request, String userId) {
        // 检查名称唯一性
        int count = dataStructureMapper.countByName(projectId, request.getFlowId(), request.getName(), null);
        if (count > 0) {
            throw new IllegalArgumentException("同一作用域内已存在名为 '" + request.getName() + "' 的数据结构");
        }

        DataStructure entity = new DataStructure();
        entity.setProjectId(projectId);
        entity.setFlowId(request.getFlowId());
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setFieldsJson(serializeFields(request.getFields()));
        entity.setTypeParametersJson(serializeTypeParameters(request.getTypeParameters()));
        entity.setUsageCount(0);
        entity.setCreatedBy(userId);

        dataStructureMapper.insert(entity);
        log.info("创建数据结构: projectId={}, flowId={}, name={}", projectId, request.getFlowId(), request.getName());

        return toResponse(entity);
    }

    /**
     * 更新数据结构
     */
    @Transactional
    public DataStructureResponse update(String id, DataStructureRequest request, String projectId) {
        DataStructure entity = dataStructureMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("数据结构不存在: " + id);
        }

        // 检查名称唯一性（排除自身）
        int count = dataStructureMapper.countByName(projectId, entity.getFlowId(), request.getName(), id);
        if (count > 0) {
            throw new IllegalArgumentException("同一作用域内已存在名为 '" + request.getName() + "' 的数据结构");
        }

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setFieldsJson(serializeFields(request.getFields()));
        entity.setTypeParametersJson(serializeTypeParameters(request.getTypeParameters()));

        dataStructureMapper.updateById(entity);
        log.info("更新数据结构: id={}, name={}", id, request.getName());

        return toResponse(entity);
    }

    /**
     * 删除数据结构
     */
    @Transactional
    public void delete(String id) {
        DataStructure entity = dataStructureMapper.selectById(id);
        if (entity == null) {
            return;
        }

        if (entity.getUsageCount() != null && entity.getUsageCount() > 0) {
            throw new IllegalArgumentException("数据结构正在被引用，无法删除。引用次数: " + entity.getUsageCount());
        }

        dataStructureMapper.deleteById(id);
        log.info("删除数据结构: id={}, name={}", id, entity.getName());
    }

    /**
     * 获取单个数据结构
     */
    public DataStructureResponse getById(String id) {
        DataStructure entity = dataStructureMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("数据结构不存在: " + id);
        }
        return toResponse(entity);
    }

    /**
     * 获取项目级数据结构列表
     */
    public List<DataStructureResponse> getProjectLevelStructures(String projectId) {
        List<DataStructure> entities = dataStructureMapper.selectProjectLevelStructures(projectId);
        List<DataStructureResponse> responses = entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toCollection(ArrayList::new));
        addBuiltinStructures(responses, projectId);
        return responses;
    }

    /**
     * 获取流程级数据结构列表
     */
    public List<DataStructureResponse> getFlowLevelStructures(String flowId) {
        List<DataStructure> entities = dataStructureMapper.selectFlowLevelStructures(flowId);
        return entities.stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * 获取项目下所有数据结构（按作用域分组）
     */
    public Map<String, List<DataStructureResponse>> getAllByProjectGrouped(String projectId) {
        List<DataStructure> entities = dataStructureMapper.selectAllByProject(projectId);
        
        Map<String, List<DataStructureResponse>> grouped = new LinkedHashMap<>();
        
        // 项目级结构
        List<DataStructureResponse> projectLevel = entities.stream()
                .filter(DataStructure::isProjectLevel)
                .map(this::toResponse)
                .collect(Collectors.toCollection(ArrayList::new));
        addBuiltinStructures(projectLevel, projectId);
        if (!projectLevel.isEmpty()) {
            grouped.put("global", projectLevel);
        }
        
        // 流程级结构（按流程分组）
        entities.stream()
                .filter(e -> !e.isProjectLevel())
                .collect(Collectors.groupingBy(DataStructure::getFlowId))
                .forEach((flowId, list) -> {
                    List<DataStructureResponse> responses = list.stream()
                            .map(this::toResponse)
                            .collect(Collectors.toList());
                    // 获取流程名称作为 key
                    String flowName = getFlowName(flowId);
                    grouped.put(flowName != null ? flowName : flowId, responses);
                });
        
        return grouped;
    }

    /**
     * 获取可用的数据结构列表（用于选择器）
     * 包括当前流程内的结构、项目级结构、以及子流程的结构
     */
    public List<DataStructureResponse> getAvailableStructures(String projectId, String currentFlowId) {
        List<DataStructure> entities = dataStructureMapper.selectAllByProject(projectId);
        
        List<DataStructureResponse> responses = entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toCollection(ArrayList::new));
        addBuiltinStructures(responses, projectId);
        return responses;
    }

    /**
     * 从 JSON 样本生成数据结构
     */
    public DataStructureResponse generateFromJson(String projectId, GenerateFromJsonRequest request, String userId) {
        Map<String, Object> jsonObj;
        
        if (request.getJsonObject() != null) {
            jsonObj = request.getJsonObject();
        } else if (request.getJsonSample() != null && !request.getJsonSample().isEmpty()) {
            try {
                jsonObj = objectMapper.readValue(request.getJsonSample(), new TypeReference<Map<String, Object>>() {});
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("JSON 格式无效: " + e.getMessage());
            }
        } else {
            throw new IllegalArgumentException("请提供 JSON 样本");
        }

        // 生成字段定义
        List<FieldDefinitionDTO> fields = inferFieldsFromJson(jsonObj);

        // 创建数据结构
        DataStructureRequest createRequest = new DataStructureRequest();
        createRequest.setName(request.getStructureName() != null ? request.getStructureName() : "GeneratedStructure");
        createRequest.setFlowId(request.getFlowId());
        createRequest.setFields(fields);
        createRequest.setDescription("从 JSON 样本自动生成");

        return create(projectId, createRequest, userId);
    }

    /**
     * 预览从 JSON 生成的字段定义（不保存）
     */
    public List<FieldDefinitionDTO> previewGenerateFromJson(String jsonSample) {
        try {
            Map<String, Object> jsonObj = objectMapper.readValue(jsonSample, new TypeReference<Map<String, Object>>() {});
            return inferFieldsFromJson(jsonObj);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("JSON 格式无效: " + e.getMessage());
        }
    }

    /**
     * 从 JSON 对象推断字段定义
     */
    @SuppressWarnings("unchecked")
    private List<FieldDefinitionDTO> inferFieldsFromJson(Map<String, Object> jsonObj) {
        List<FieldDefinitionDTO> fields = new ArrayList<>();
        
        for (Map.Entry<String, Object> entry : jsonObj.entrySet()) {
            FieldDefinitionDTO field = new FieldDefinitionDTO();
            field.setName(entry.getKey());
            
            Object value = entry.getValue();
            if (value == null) {
                field.setType("string");
            } else if (value instanceof String) {
                field.setType("string");
                field.setExample(value);
            } else if (value instanceof Number) {
                field.setType("number");
                field.setExample(value);
            } else if (value instanceof Boolean) {
                field.setType("boolean");
                field.setExample(value);
            } else if (value instanceof List) {
                field.setType("array");
                List<?> list = (List<?>) value;
                if (!list.isEmpty()) {
                    Object firstItem = list.get(0);
                    applyArrayItemDefinition(field, firstItem);
                }
            } else if (value instanceof Map) {
                field.setType("object");
                field.setNestedFields(inferFieldsFromJson((Map<String, Object>) value));
            }
            
            fields.add(field);
        }
        
        return fields;
    }

    @SuppressWarnings("unchecked")
    private void applyArrayItemDefinition(FieldDefinitionDTO field, Object firstItem) {
        if (firstItem instanceof Map) {
            field.setItemType("object");
            field.setItemFields(inferFieldsFromJson((Map<String, Object>) firstItem));
            return;
        }
        if (firstItem instanceof List) {
            field.setItemType("array");
            List<?> innerList = (List<?>) firstItem;
            if (!innerList.isEmpty()) {
                FieldDefinitionDTO innerDef = buildArrayElementDefinition(innerList.get(0));
                if (innerDef != null) {
                    field.setItemFields(List.of(innerDef));
                }
            }
            return;
        }
        if (firstItem instanceof String) {
            field.setItemType("string");
            return;
        }
        if (firstItem instanceof Number) {
            field.setItemType("number");
            return;
        }
        if (firstItem instanceof Boolean) {
            field.setItemType("boolean");
            return;
        }
        field.setItemType("string");
    }

    @SuppressWarnings("unchecked")
    private FieldDefinitionDTO buildArrayElementDefinition(Object sample) {
        FieldDefinitionDTO def = new FieldDefinitionDTO();
        def.setName("item");
        if (sample instanceof Map) {
            def.setType("object");
            def.setNestedFields(inferFieldsFromJson((Map<String, Object>) sample));
            return def;
        }
        if (sample instanceof List) {
            def.setType("array");
            List<?> innerList = (List<?>) sample;
            if (!innerList.isEmpty()) {
                applyArrayItemDefinition(def, innerList.get(0));
            }
            return def;
        }
        if (sample instanceof String) {
            def.setType("string");
            return def;
        }
        if (sample instanceof Number) {
            def.setType("number");
            return def;
        }
        if (sample instanceof Boolean) {
            def.setType("boolean");
            return def;
        }
        def.setType("string");
        return def;
    }

    /**
     * 复制数据结构到另一个作用域
     */
    @Transactional
    public DataStructureResponse copyTo(String sourceId, String targetFlowId, String newName, String userId) {
        DataStructure source = dataStructureMapper.selectById(sourceId);
        if (source == null) {
            throw new IllegalArgumentException("源数据结构不存在: " + sourceId);
        }

        DataStructureRequest request = new DataStructureRequest();
        request.setName(newName != null ? newName : source.getName());
        request.setDescription(source.getDescription());
        request.setFields(deserializeFields(source.getFieldsJson()));
        request.setTypeParameters(deserializeTypeParameters(source.getTypeParametersJson()));
        request.setFlowId(targetFlowId);

        return create(source.getProjectId(), request, userId);
    }

    /**
     * 将流程级结构提升为项目级
     */
    @Transactional
    public DataStructureResponse promoteToProjectLevel(String id, String userId) {
        DataStructure entity = dataStructureMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("数据结构不存在: " + id);
        }
        if (entity.isProjectLevel()) {
            throw new IllegalArgumentException("该数据结构已经是项目级");
        }

        // 检查项目级是否有同名结构
        int count = dataStructureMapper.countByName(entity.getProjectId(), null, entity.getName(), null);
        if (count > 0) {
            throw new IllegalArgumentException("项目级已存在同名数据结构: " + entity.getName());
        }

        entity.setFlowId(null);
        dataStructureMapper.updateById(entity);
        
        log.info("将数据结构提升为项目级: id={}, name={}", id, entity.getName());
        return toResponse(entity);
    }

    // ==================== 辅助方法 ====================

    private String serializeFields(List<FieldDefinitionDTO> fields) {
        if (fields == null) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(fields);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化字段定义失败", e);
        }
    }

    private List<FieldDefinitionDTO> deserializeFields(String fieldsJson) {
        if (fieldsJson == null || fieldsJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(fieldsJson, new TypeReference<List<FieldDefinitionDTO>>() {});
        } catch (JsonProcessingException e) {
            log.warn("反序列化字段定义失败: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private String serializeTypeParameters(List<TypeParameterDTO> typeParameters) {
        if (typeParameters == null || typeParameters.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(typeParameters);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化泛型参数失败", e);
        }
    }

    private List<TypeParameterDTO> deserializeTypeParameters(String typeParametersJson) {
        if (typeParametersJson == null || typeParametersJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(typeParametersJson, new TypeReference<List<TypeParameterDTO>>() {});
        } catch (JsonProcessingException e) {
            log.warn("反序列化泛型参数失败: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private DataStructureResponse toResponse(DataStructure entity) {
        DataStructureResponse response = new DataStructureResponse();
        response.setId(entity.getId());
        response.setProjectId(entity.getProjectId());
        response.setFlowId(entity.getFlowId());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setFields(deserializeFields(entity.getFieldsJson()));
        response.setTypeParameters(deserializeTypeParameters(entity.getTypeParametersJson()));
        response.setIsGeneric(entity.isGeneric());
        response.setUsageCount(entity.getUsageCount());
        response.setIsProjectLevel(entity.isProjectLevel());
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());

        // 设置流程名称和完整引用名称
        String baseName = entity.getName();
        // 如果是泛型结构，在名称后添加泛型参数显示
        if (entity.isGeneric()) {
            List<TypeParameterDTO> typeParams = deserializeTypeParameters(entity.getTypeParametersJson());
            String paramNames = typeParams.stream()
                    .map(TypeParameterDTO::getName)
                    .collect(Collectors.joining(", "));
            baseName = entity.getName() + "<" + paramNames + ">";
        }
        
        if (entity.isProjectLevel()) {
            response.setFullName("global." + baseName);
        } else {
            String flowName = getFlowName(entity.getFlowId());
            response.setFlowName(flowName);
            response.setFullName((flowName != null ? flowName : entity.getFlowId()) + "." + baseName);
        }

        return response;
    }

    private void addBuiltinStructures(List<DataStructureResponse> responses, String projectId) {
        if (responses == null) {
            return;
        }

        Set<String> existingProjectNames = responses.stream()
                .filter(item -> item.getFlowId() == null)
                .map(DataStructureResponse::getName)
                .filter(Objects::nonNull)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        List<DataStructureResponse> builtins = buildBuiltinStructures(projectId);
        for (int i = builtins.size() - 1; i >= 0; i--) {
            DataStructureResponse builtin = builtins.get(i);
            String name = builtin.getName();
            if (name != null && existingProjectNames.contains(name.toLowerCase())) {
                continue;
            }
            responses.add(0, builtin);
        }
    }

    private List<DataStructureResponse> buildBuiltinStructures(String projectId) {
        List<DataStructureResponse> builtins = new ArrayList<>();
        builtins.add(buildBuiltinStructure(
                "builtin:list",
                projectId,
                "List",
                "内置 List 集合类型",
                Arrays.asList(TypeParameterDTO.of("T"))
        ));
        builtins.add(buildBuiltinStructure(
                "builtin:set",
                projectId,
                "Set",
                "内置 Set 集合类型",
                Arrays.asList(TypeParameterDTO.of("T"))
        ));
        builtins.add(buildBuiltinStructure(
                "builtin:map",
                projectId,
                "Map",
                "内置 Map 集合类型",
                Arrays.asList(TypeParameterDTO.of("K"), TypeParameterDTO.of("V"))
        ));
        return builtins;
    }

    private DataStructureResponse buildBuiltinStructure(
            String id,
            String projectId,
            String name,
            String description,
            List<TypeParameterDTO> typeParameters
    ) {
        DataStructureResponse response = new DataStructureResponse();
        response.setId(id);
        response.setProjectId(projectId);
        response.setFlowId(null);
        response.setFlowName(null);
        response.setName(name);
        response.setDescription(description);
        response.setFields(new ArrayList<>());
        response.setTypeParameters(typeParameters);
        response.setIsGeneric(true);
        response.setUsageCount(0);
        response.setIsProjectLevel(true);
        response.setCreatedBy("system");

        String paramNames = typeParameters.stream()
                .map(TypeParameterDTO::getName)
                .collect(Collectors.joining(", "));
        response.setFullName("global." + name + "<" + paramNames + ">");
        return response;
    }

    private String getFlowName(String flowId) {
        if (flowId == null) return null;
        FlowDefinition flow = flowDefinitionMapper.selectById(flowId);
        return flow != null ? flow.getName() : null;
    }
}
