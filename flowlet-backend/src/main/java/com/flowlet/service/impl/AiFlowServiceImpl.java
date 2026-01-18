package com.flowlet.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.flowlet.dto.ai.AiFlowMessageRecord;
import com.flowlet.dto.ai.AiFlowMessageRequest;
import com.flowlet.dto.ai.AiFlowMessageResponse;
import com.flowlet.dto.ai.AiFlowRegenerateRequest;
import com.flowlet.dto.ai.AiFlowSessionDetail;
import com.flowlet.dto.ai.AiFlowSessionRequest;
import com.flowlet.dto.ai.AiFlowSessionResponse;
import com.flowlet.entity.AiFlowMessage;
import com.flowlet.entity.AiFlowSession;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.ModelProvider;
import com.flowlet.enums.ModelProviderType;
import com.flowlet.enums.NodeType;
import com.flowlet.enums.FlowStatus;
import com.flowlet.mapper.AiFlowMessageMapper;
import com.flowlet.mapper.AiFlowSessionMapper;
import com.flowlet.mapper.FlowDefinitionMapper;
import com.flowlet.mapper.ModelProviderMapper;
import com.flowlet.service.AiFlowService;
import com.flowlet.service.ProjectAccessService;
import com.flowlet.util.ModelHubCrypto;
import com.flowlet.util.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiFlowServiceImpl implements AiFlowService {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(60);
    private static final Pattern CODE_FENCE_PATTERN =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", Pattern.CASE_INSENSITIVE);

    private static final ObjectMapper lenientMapper = JsonMapper.builder()
            .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
            .enable(JsonReadFeature.ALLOW_JAVA_COMMENTS)
            .enable(JsonReadFeature.ALLOW_SINGLE_QUOTES)
            .enable(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES)
            .build();

    private final AiFlowSessionMapper sessionMapper;
    private final AiFlowMessageMapper messageMapper;
    private final FlowDefinitionMapper flowDefinitionMapper;
    private final ModelProviderMapper modelProviderMapper;
    private final ProjectAccessService projectAccessService;
    private final ModelHubCrypto modelHubCrypto;
    private final WebClient.Builder webClientBuilder;

    private static final Map<String, String> NODE_DESCRIPTIONS = Map.ofEntries(
            Map.entry(NodeType.START.getValue(), "流程入口节点"),
            Map.entry(NodeType.END.getValue(), "流程结束节点"),
            Map.entry(NodeType.API.getValue(), "HTTP API 调用"),
            Map.entry(NodeType.KAFKA.getValue(), "Kafka 消息发送/等待回调"),
            Map.entry(NodeType.CODE.getValue(), "执行代码脚本"),
            Map.entry(NodeType.CONDITION.getValue(), "条件分支判断"),
            Map.entry(NodeType.TRANSFORM.getValue(), "字段映射与转换"),
            Map.entry(NodeType.SUBFLOW.getValue(), "调用可复用子流程"),
            Map.entry(NodeType.LLM.getValue(), "大模型调用"),
            Map.entry(NodeType.VARIABLE_ASSIGNER.getValue(), "变量赋值"),
            Map.entry(NodeType.JSON_PARSER.getValue(), "JSON 解析器"),
            Map.entry(NodeType.FOR_EACH.getValue(), "ForEach 循环迭代处理")
    );

    @Override
    public AiFlowSessionResponse createSession(AiFlowSessionRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (userId == null || tenantId == null) {
            throw new IllegalStateException("用户未认证");
        }
        if (!projectAccessService.canEdit(request.getProjectId(), userId)) {
            throw new IllegalStateException("没有项目编辑权限");
        }

        AiFlowSession session = new AiFlowSession();
        session.setTenantId(tenantId);
        session.setProjectId(request.getProjectId());
        session.setFlowId(request.getFlowId());
        session.setProviderType(normalizeProviderType(request.getProviderType()));
        session.setProviderKey(normalizeProviderKey(request.getProviderKey()));
        session.setProviderId(request.getProviderId());
        session.setModel(request.getModel());
        session.setCreatedBy(userId);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        sessionMapper.insert(session);
        return toSessionResponse(session);
    }

    @Override
    public AiFlowSessionDetail getSessionDetail(String sessionId) {
        AiFlowSession session = getSessionOrThrow(sessionId);
        AiFlowSessionDetail detail = new AiFlowSessionDetail();
        detail.setSession(toSessionResponse(session));
        detail.setCurrentDsl(session.getCurrentDsl());
        detail.setMessages(loadMessages(sessionId));
        return detail;
    }

    @Override
    public AiFlowMessageResponse sendMessage(String sessionId, AiFlowMessageRequest request) {
        AiFlowSession session = getSessionOrThrow(sessionId);
        applySessionOverrides(
                session,
                request.getProviderType(),
                request.getProviderKey(),
                request.getProviderId(),
                request.getModel()
        );

        String currentDsl = request.getCurrentDsl();
        if (currentDsl == null || currentDsl.isBlank()) {
            currentDsl = Optional.ofNullable(session.getCurrentDsl())
                    .filter(value -> !value.isBlank())
                    .orElseGet(this::defaultDsl);
        }

        AiFlowMessage userMessage = new AiFlowMessage();
        userMessage.setSessionId(sessionId);
        userMessage.setRole("user");
        userMessage.setContent(request.getMessage().trim());
        userMessage.setCreatedAt(LocalDateTime.now());
        messageMapper.insert(userMessage);

        List<AiFlowMessageRecord> history = loadMessages(sessionId);
        List<Map<String, Object>> availableNodes = buildAvailableNodes();
        List<Map<String, Object>> reusableFlows = loadReusableFlows(session);

        String assistantContent;
        String patchJson;
        String updatedDsl;

        try {
            Map<String, Object> aiResponse = callAi(session, currentDsl, history, availableNodes, reusableFlows);
            assistantContent = String.valueOf(aiResponse.getOrDefault("assistant_message", "已生成流程更新。"));
            Object patch = aiResponse.get("patch");
            if (patch == null) {
                throw new IllegalStateException("模型响应缺少 patch");
            }
            patchJson = lenientMapper.writeValueAsString(patch);
            updatedDsl = applyPatch(currentDsl, patch);
        } catch (Exception ex) {
            log.error("AI 生成流程失败: {}", ex.getMessage(), ex);
            throw new IllegalStateException("AI 生成流程失败: " + ex.getMessage());
        }

        AiFlowMessage assistantMessage = new AiFlowMessage();
        assistantMessage.setSessionId(sessionId);
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(assistantContent);
        assistantMessage.setPatchJson(patchJson);
        assistantMessage.setCreatedAt(LocalDateTime.now());
        messageMapper.insert(assistantMessage);

        session.setCurrentDsl(updatedDsl);
        session.setUpdatedAt(LocalDateTime.now());
        sessionMapper.updateById(session);

        AiFlowMessageResponse response = new AiFlowMessageResponse();
        response.setSessionId(sessionId);
        response.setMessageId(assistantMessage.getId());
        response.setRole("assistant");
        response.setContent(assistantContent);
        response.setPatchJson(patchJson);
        response.setCurrentDsl(updatedDsl);
        response.setCreatedAt(assistantMessage.getCreatedAt());
        return response;
    }

    @Override
    public AiFlowMessageResponse regenerateLastMessage(String sessionId, AiFlowRegenerateRequest request) {
        AiFlowSession session = getSessionOrThrow(sessionId);
        applySessionOverrides(
                session,
                request.getProviderType(),
                request.getProviderKey(),
                request.getProviderId(),
                request.getModel()
        );
        List<AiFlowMessageRecord> history = loadMessages(sessionId);
        int lastUserIndex = -1;
        for (int i = history.size() - 1; i >= 0; i--) {
            if ("user".equalsIgnoreCase(history.get(i).getRole())) {
                lastUserIndex = i;
                break;
            }
        }
        if (lastUserIndex < 0) {
            throw new IllegalStateException("没有可重新生成的用户消息");
        }

        List<AiFlowMessageRecord> trimmedHistory = history.subList(0, lastUserIndex + 1);
        String currentDsl = request.getCurrentDsl();
        if (currentDsl == null || currentDsl.isBlank()) {
            currentDsl = Optional.ofNullable(session.getCurrentDsl())
                .filter(value -> !value.isBlank())
                .orElseGet(this::defaultDsl);
        }

        String assistantContent;
        String patchJson;
        String updatedDsl;
        try {
            Map<String, Object> aiResponse = callAi(
                    session,
                    currentDsl,
                    trimmedHistory,
                    buildAvailableNodes(),
                    loadReusableFlows(session)
            );
            assistantContent = String.valueOf(aiResponse.getOrDefault("assistant_message", "已生成流程更新。"));
            Object patch = aiResponse.get("patch");
            if (patch == null) {
                throw new IllegalStateException("模型响应缺少 patch");
            }
            patchJson = lenientMapper.writeValueAsString(patch);
            updatedDsl = applyPatch(currentDsl, patch);
        } catch (Exception ex) {
            log.error("AI 重新生成失败: {}", ex.getMessage(), ex);
            throw new IllegalStateException("AI 重新生成失败: " + ex.getMessage());
        }

        AiFlowMessage assistantMessage = new AiFlowMessage();
        assistantMessage.setSessionId(sessionId);
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(assistantContent);
        assistantMessage.setPatchJson(patchJson);
        assistantMessage.setCreatedAt(LocalDateTime.now());
        messageMapper.insert(assistantMessage);

        session.setCurrentDsl(updatedDsl);
        session.setUpdatedAt(LocalDateTime.now());
        sessionMapper.updateById(session);

        AiFlowMessageResponse response = new AiFlowMessageResponse();
        response.setSessionId(sessionId);
        response.setMessageId(assistantMessage.getId());
        response.setRole("assistant");
        response.setContent(assistantContent);
        response.setPatchJson(patchJson);
        response.setCurrentDsl(updatedDsl);
        response.setCreatedAt(assistantMessage.getCreatedAt());
        return response;
    }

    private AiFlowSession getSessionOrThrow(String sessionId) {
        AiFlowSession session = sessionMapper.selectById(sessionId);
        if (session == null) {
            throw new IllegalStateException("会话不存在");
        }
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (tenantId == null || !tenantId.equals(session.getTenantId())) {
            throw new IllegalStateException("没有访问权限");
        }
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null || !projectAccessService.canEdit(session.getProjectId(), userId)) {
            throw new IllegalStateException("没有项目编辑权限");
        }
        return session;
    }

    private List<AiFlowMessageRecord> loadMessages(String sessionId) {
        LambdaQueryWrapper<AiFlowMessage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiFlowMessage::getSessionId, sessionId)
                .orderByAsc(AiFlowMessage::getCreatedAt);
        return messageMapper.selectList(wrapper).stream()
                .map(this::toMessageRecord)
                .collect(Collectors.toList());
    }

    private AiFlowMessageRecord toMessageRecord(AiFlowMessage message) {
        AiFlowMessageRecord record = new AiFlowMessageRecord();
        record.setId(message.getId());
        record.setRole(message.getRole());
        record.setContent(message.getContent());
        record.setPatchJson(message.getPatchJson());
        record.setCreatedAt(message.getCreatedAt());
        return record;
    }

    private AiFlowSessionResponse toSessionResponse(AiFlowSession session) {
        AiFlowSessionResponse response = new AiFlowSessionResponse();
        response.setId(session.getId());
        response.setProjectId(session.getProjectId());
        response.setFlowId(session.getFlowId());
        response.setProviderType(session.getProviderType());
        response.setProviderKey(session.getProviderKey());
        response.setProviderId(session.getProviderId());
        response.setModel(session.getModel());
        response.setCreatedAt(session.getCreatedAt());
        response.setUpdatedAt(session.getUpdatedAt());
        return response;
    }

    private String normalizeProviderType(String providerType) {
        String value = providerType == null || providerType.isBlank()
                ? ModelProviderType.STANDARD.name()
                : providerType.toUpperCase(Locale.ROOT);
        return value;
    }

    private String normalizeProviderKey(String providerKey) {
        if (providerKey == null) {
            return null;
        }
        return providerKey.toLowerCase(Locale.ROOT);
    }

    private void applySessionOverrides(
            AiFlowSession session,
            String providerType,
            String providerKey,
            String providerId,
            String model
    ) {
        boolean changed = false;
        if (providerType != null && !providerType.isBlank()) {
            session.setProviderType(normalizeProviderType(providerType));
            changed = true;
        }
        if (providerKey != null && !providerKey.isBlank()) {
            session.setProviderKey(normalizeProviderKey(providerKey));
            changed = true;
        }
        if (providerId != null && !providerId.isBlank()) {
            session.setProviderId(providerId);
            changed = true;
        }
        if (model != null && !model.isBlank()) {
            session.setModel(model);
            changed = true;
        }
        if (changed) {
            session.setUpdatedAt(LocalDateTime.now());
            sessionMapper.updateById(session);
        }
    }

    private List<Map<String, Object>> buildAvailableNodes() {
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (NodeType nodeType : NodeType.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", nodeType.getValue());
            item.put("description", NODE_DESCRIPTIONS.getOrDefault(nodeType.getValue(), ""));
            nodes.add(item);
        }
        return nodes;
    }

    private List<Map<String, Object>> loadReusableFlows(AiFlowSession session) {
        LambdaQueryWrapper<FlowDefinition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowDefinition::getProjectId, session.getProjectId())
                .eq(FlowDefinition::getIsReusable, true)
                .eq(FlowDefinition::getStatus, FlowStatus.PUBLISHED.getValue());
        if (session.getFlowId() != null && !session.getFlowId().isBlank()) {
            wrapper.ne(FlowDefinition::getId, session.getFlowId());
        }
        List<FlowDefinition> flows = flowDefinitionMapper.selectList(wrapper);
        List<Map<String, Object>> result = new ArrayList<>();
        for (FlowDefinition flow : flows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", flow.getId());
            item.put("name", flow.getName());
            item.put("description", flow.getDescription());
            item.put("inputSchema", flow.getInputSchema());
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> callAi(
            AiFlowSession session,
            String currentDsl,
            List<AiFlowMessageRecord> history,
            List<Map<String, Object>> availableNodes,
            List<Map<String, Object>> reusableFlows
    ) throws JsonProcessingException {
        ModelProvider provider = resolveProvider(session);
        String apiKey = modelHubCrypto.decrypt(provider.getApiKeyEncrypted());
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("模型提供方未配置 API Key");
        }

        String model = session.getModel();
        if (model == null || model.isBlank()) {
            model = provider.getDefaultModel();
        }
        if (model == null || model.isBlank()) {
            throw new IllegalStateException("模型不能为空");
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildSystemPrompt()));
        messages.add(Map.of("role", "user", "content", buildContextPayload(currentDsl, availableNodes, reusableFlows)));

        List<AiFlowMessageRecord> trimmed = trimHistory(history, 12);
        for (AiFlowMessageRecord record : trimmed) {
            messages.add(Map.of(
                    "role", record.getRole(),
                    "content", record.getContent()
            ));
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", model);
        request.put("messages", messages);
        request.put("temperature", 0.2);

        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(provider.getBaseUrl())).build();
        ParameterizedTypeReference<Map<String, Object>> responseType =
                new ParameterizedTypeReference<>() {};

        Map<String, Object> response;
        try {
            response = client.post()
                    .uri("/chat/completions")
                    .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                    .header("Authorization", "Bearer " + apiKey)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(responseType)
                    .block(DEFAULT_TIMEOUT);
        } catch (WebClientResponseException ex) {
            throw new IllegalStateException("LLM 调用失败: " + ex.getStatusCode());
        }

        if (response == null) {
            throw new IllegalStateException("LLM 响应为空");
        }

        String content = extractAssistantText(response);
        if (content == null || content.isBlank()) {
            throw new IllegalStateException("LLM 未返回内容");
        }
        return parseAssistantJson(content);
    }

    private ModelProvider resolveProvider(AiFlowSession session) {
        String tenantId = SecurityUtils.getCurrentTenantId();
        String providerType = normalizeProviderType(session.getProviderType());
        if (ModelProviderType.CUSTOM.name().equals(providerType)) {
            if (session.getProviderId() == null || session.getProviderId().isBlank()) {
                throw new IllegalStateException("自定义提供方未指定");
            }
            ModelProvider provider = modelProviderMapper.selectById(session.getProviderId());
            if (provider == null || !tenantId.equals(provider.getTenantId())) {
                throw new IllegalStateException("未找到模型提供方配置");
            }
            return provider;
        }
        String providerKey = normalizeProviderKey(session.getProviderKey());
        if (providerKey == null || providerKey.isBlank()) {
            providerKey = "openai";
        }
        ModelProvider provider = modelProviderMapper.selectOne(new QueryWrapper<ModelProvider>()
                .eq("tenant_id", tenantId)
                .eq("provider_type", ModelProviderType.STANDARD.name())
                .eq("provider_key", providerKey));
        if (provider == null) {
            throw new IllegalStateException("未找到模型提供方配置");
        }
        if (!Boolean.TRUE.equals(provider.getEnabled())) {
            throw new IllegalStateException("模型提供方已停用");
        }
        return provider;
    }

    private String buildSystemPrompt() {
        return String.join("\n",
                "你是 Flowlet 流程编排助手，负责输出可执行的 DSL 补丁。",
                "只能输出 JSON，不要输出额外文本或代码块。",
                "返回 JSON 格式：{ \"assistant_message\": \"...\", \"patch\": { \"operations\": [...] } }。",
                "patch.operations 支持：",
                "- add_node: { op: \"add_node\", node: { id, type, label?, description?, config?, alias?, position? } }",
                "- update_node: { op: \"update_node\", id: \"node-id\", patch: { label?, description?, config?, alias?, position?, type? } }",
                "- remove_node: { op: \"remove_node\", id: \"node-id\" }",
                "- add_edge: { op: \"add_edge\", edge: { id?, source, target, label?, sourceHandle?, targetHandle?, type?, animated? } }",
                "- update_edge: { op: \"update_edge\", id: \"edge-id\", patch: { label?, sourceHandle?, targetHandle?, type?, animated? } }",
                "- remove_edge: { op: \"remove_edge\", id: \"edge-id\" }",
                "只返回需要的增量修改，不要返回完整 DSL。"
        );
    }

    private String buildContextPayload(
            String currentDsl,
            List<Map<String, Object>> availableNodes,
            List<Map<String, Object>> reusableFlows
    ) throws JsonProcessingException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currentDsl", lenientMapper.readValue(currentDsl, Object.class));
        payload.put("availableNodes", availableNodes);
        payload.put("reusableFlows", reusableFlows);
        return lenientMapper.writeValueAsString(payload);
    }

    private List<AiFlowMessageRecord> trimHistory(List<AiFlowMessageRecord> history, int maxItems) {
        if (history.size() <= maxItems) {
            return history;
        }
        return history.subList(history.size() - maxItems, history.size());
    }

    private String extractAssistantText(Map<String, Object> response) {
        Object choices = response.get("choices");
        if (!(choices instanceof List<?> list) || list.isEmpty()) {
            return null;
        }
        Object first = list.get(0);
        if (!(first instanceof Map<?, ?> choice)) {
            return null;
        }
        Object message = choice.get("message");
        if (!(message instanceof Map<?, ?> msg)) {
            return null;
        }
        Object content = msg.get("content");
        return content == null ? null : String.valueOf(content);
    }

    private Map<String, Object> parseAssistantJson(String content) throws JsonProcessingException {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            Matcher matcher = CODE_FENCE_PATTERN.matcher(trimmed);
            if (matcher.find()) {
                trimmed = matcher.group(1);
            }
        }
        Object parsed = lenientMapper.readValue(trimmed, Object.class);
        if (!(parsed instanceof Map<?, ?> map)) {
            throw new IllegalStateException("AI 响应格式无效");
        }
        return lenientMapper.convertValue(map, new TypeReference<Map<String, Object>>() {});
    }

    private String defaultDsl() {
        return """
            {"nodes":[{"id":"start-1","type":"start","label":"开始"},{"id":"end-1","type":"end","label":"结束"}],"edges":[{"id":"edge-start-end","source":"start-1","target":"end-1"}]}
            """;
    }

    private String applyPatch(String currentDsl, Object patchObj) throws JsonProcessingException {
        Map<String, Object> dsl = lenientMapper.readValue(
                currentDsl,
                new TypeReference<Map<String, Object>>() {}
        );
        List<Map<String, Object>> nodes = ensureList(dsl, "nodes");
        List<Map<String, Object>> edges = ensureList(dsl, "edges");
        Map<String, Map<String, Object>> nodeIndex = indexById(nodes);
        Map<String, Map<String, Object>> edgeIndex = indexById(edges);

        Object normalizedPatch = patchObj;
        if (patchObj instanceof String patchString) {
            normalizedPatch = lenientMapper.readValue(patchString, Object.class);
        }
        Map<String, Object> patch = castMap(normalizedPatch);
        if (patch == null) {
            throw new IllegalStateException("patch 格式无效");
        }
        Object opsObj = patch.get("operations");
        if (!(opsObj instanceof List<?> operations)) {
            throw new IllegalStateException("patch.operations 缺失");
        }

        for (Object opObj : operations) {
            if (!(opObj instanceof Map<?, ?> op)) {
                continue;
            }
            String type = String.valueOf(op.get("op"));
            switch (type) {
                case "add_node" -> {
                    Map<String, Object> node = castMap(op.get("node"));
                    if (node == null || node.get("id") == null) {
                        continue;
                    }
                    String id = String.valueOf(node.get("id"));
                    Map<String, Object> existing = nodeIndex.get(id);
                    if (existing != null) {
                        mergeMap(existing, node);
                    } else {
                        Map<String, Object> created = new LinkedHashMap<>(node);
                        nodes.add(created);
                        nodeIndex.put(id, created);
                    }
                }
                case "update_node" -> {
                    String id = String.valueOf(op.get("id"));
                    Map<String, Object> patchMap = castMap(op.get("patch"));
                    if (id == null || patchMap == null) {
                        continue;
                    }
                    Map<String, Object> target = nodeIndex.get(id);
                    if (target != null) {
                        mergeMap(target, patchMap);
                    }
                }
                case "remove_node" -> {
                    String id = String.valueOf(op.get("id"));
                    if (id == null) {
                        continue;
                    }
                    nodeIndex.remove(id);
                    nodes.removeIf(node -> id.equals(String.valueOf(node.get("id"))));
                    edges.removeIf(edge -> id.equals(String.valueOf(edge.get("source")))
                            || id.equals(String.valueOf(edge.get("target"))));
                }
                case "add_edge" -> {
                    Map<String, Object> edge = castMap(op.get("edge"));
                    if (edge == null || edge.get("source") == null || edge.get("target") == null) {
                        continue;
                    }
                    String id = edge.get("id") == null
                            ? "edge-" + edge.get("source") + "-" + edge.get("target") + "-" + (edges.size() + 1)
                            : String.valueOf(edge.get("id"));
                    edge.put("id", id);
                    Map<String, Object> existing = edgeIndex.get(id);
                    if (existing != null) {
                        mergeMap(existing, edge);
                    } else {
                        Map<String, Object> created = new LinkedHashMap<>(edge);
                        edges.add(created);
                        edgeIndex.put(id, created);
                    }
                }
                case "update_edge" -> {
                    String id = String.valueOf(op.get("id"));
                    Map<String, Object> patchMap = castMap(op.get("patch"));
                    if (id == null || patchMap == null) {
                        continue;
                    }
                    Map<String, Object> target = edgeIndex.get(id);
                    if (target != null) {
                        mergeMap(target, patchMap);
                    }
                }
                case "remove_edge" -> {
                    String id = String.valueOf(op.get("id"));
                    if (id == null) {
                        continue;
                    }
                    edgeIndex.remove(id);
                    edges.removeIf(edge -> id.equals(String.valueOf(edge.get("id"))));
                }
                default -> {
                    // ignore unknown operation
                }
            }
        }

        dsl.put("nodes", nodes);
        dsl.put("edges", edges);
        return lenientMapper.writeValueAsString(dsl);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> ensureList(Map<String, Object> dsl, String key) {
        Object value = dsl.get(key);
        if (value instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        List<Map<String, Object>> created = new ArrayList<>();
        dsl.put(key, created);
        return created;
    }

    private Map<String, Map<String, Object>> indexById(List<Map<String, Object>> list) {
        Map<String, Map<String, Object>> index = new LinkedHashMap<>();
        for (Map<String, Object> item : list) {
            Object id = item.get("id");
            if (id != null) {
                index.put(String.valueOf(id), item);
            }
        }
        return index;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private void mergeMap(Map<String, Object> target, Map<String, Object> patch) {
        for (Map.Entry<String, Object> entry : patch.entrySet()) {
            Object value = entry.getValue();
            Object existing = target.get(entry.getKey());
            if (value instanceof Map<?, ?> valueMap && existing instanceof Map<?, ?> existingMap) {
                mergeMap((Map<String, Object>) existingMap, (Map<String, Object>) valueMap);
            } else {
                target.put(entry.getKey(), value);
            }
        }
    }
}
