package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.entity.FlowExecution;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.FlowExecutionMapper;
import com.flowlet.service.SimhashService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class SimhashNodeHandler implements NodeHandler {

    private static final int DEFAULT_MAX_DISTANCE = 3;
    private static final int MAX_ALLOWED_DISTANCE = 9;

    private final ExpressionResolver expressionResolver;
    private final FlowExecutionMapper flowExecutionMapper;
    private final SimhashService simhashService;

    @Override
    public String getNodeType() {
        return NodeType.SIMHASH.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行 Simhash 节点: {}", node.getId());

        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("Simhash 节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String mode = String.valueOf(config.getOrDefault("mode", "store"));

        String textExpression = safeString(config.get("textExpression"));
        if (textExpression == null || textExpression.isBlank()) {
            return NodeResult.fail("请输入文本表达式");
        }

        String text = expressionResolver.resolve(textExpression, context, String.class);
        if (text == null || text.isBlank()) {
            return NodeResult.fail("文本内容为空");
        }

        FlowExecution execution = flowExecutionMapper.selectById(context.getExecutionId());
        if (execution == null) {
            return NodeResult.fail("找不到执行上下文记录");
        }

        String projectId = execution.getProjectId();
        String flowId = context.getFlowId();

        SimhashService.SimhashResult simhashResult = simhashService.calculateSimhash(text);
        long simhash = simhashResult.getSimhash();

        Map<String, Object> output = new HashMap<>();
        output.put("simhash", SimhashService.toHexString(simhash));

        if ("search".equalsIgnoreCase(mode)) {
            int maxDistance = resolveMaxDistance(config.get("maxDistance"), context);
            List<String> targetFlowIds = resolveTargetFlowIds(config.get("targetFlowIds"), flowId);
            String excludeContentId = resolveOptionalContentId(config, context);

            List<SimhashService.SimhashMatch> matches = simhashService.searchMatches(
                    projectId,
                    targetFlowIds,
                    simhash,
                    maxDistance
            );

            List<String> matchedIds = new ArrayList<>();
            List<Map<String, Object>> matchItems = new ArrayList<>();
            for (SimhashService.SimhashMatch match : matches) {
                if (excludeContentId != null && excludeContentId.equals(match.getContentId())) {
                    continue;
                }
                matchedIds.add(match.getContentId());
                Map<String, Object> item = new HashMap<>();
                item.put("contentId", match.getContentId());
                item.put("flowId", match.getFlowId());
                item.put("distance", match.getDistance());
                item.put("simhash", SimhashService.toHexString(match.getSimhash()));
                item.put("contentType", match.getContentType());
                matchItems.add(item);
            }

            output.put("matchedContentIds", matchedIds);
            output.put("matches", matchItems);
            output.put("maxDistance", maxDistance);
            return NodeResult.success(output);
        }

        if ("compute".equalsIgnoreCase(mode)) {
            output.put("stored", false);
            return NodeResult.success(output);
        }

        String contentIdExpression = safeString(config.get("contentIdExpression"));
        if (contentIdExpression == null || contentIdExpression.isBlank()) {
            return NodeResult.fail("请输入内容 ID 表达式");
        }
        String contentId = expressionResolver.resolve(contentIdExpression, context, String.class);
        if (contentId == null || contentId.isBlank()) {
            return NodeResult.fail("内容 ID 为空");
        }

        String contentType = safeString(config.get("contentType"));

        simhashService.saveOrUpdate(
                projectId,
                flowId,
                contentId,
                contentType,
                simhash,
                simhashResult.getTokenCount()
        );

        output.put("stored", true);
        output.put("contentId", contentId);
        return NodeResult.success(output);
    }

    private String resolveOptionalContentId(Map<String, Object> config, ExecutionContext context) {
        String contentIdExpression = safeString(config.get("contentIdExpression"));
        if (contentIdExpression == null || contentIdExpression.isBlank()) {
            return null;
        }
        String contentId = expressionResolver.resolve(contentIdExpression, context, String.class);
        return (contentId == null || contentId.isBlank()) ? null : contentId;
    }

    private int resolveMaxDistance(Object raw, ExecutionContext context) {
        int value = DEFAULT_MAX_DISTANCE;
        if (raw instanceof Number) {
            value = ((Number) raw).intValue();
        } else if (raw instanceof String) {
            Object resolved = expressionResolver.resolve((String) raw, context);
            if (resolved instanceof Number) {
                value = ((Number) resolved).intValue();
            } else if (resolved instanceof String) {
                try {
                    value = Integer.parseInt((String) resolved);
                } catch (NumberFormatException ignored) {
                    value = DEFAULT_MAX_DISTANCE;
                }
            }
        }
        if (value < 1 || value > MAX_ALLOWED_DISTANCE) {
            return DEFAULT_MAX_DISTANCE;
        }
        return value;
    }

    private List<String> resolveTargetFlowIds(Object raw, String defaultFlowId) {
        List<String> result = new ArrayList<>();
        if (raw instanceof List<?>) {
            for (Object item : (List<?>) raw) {
                String flowId = safeString(item);
                if (flowId != null && !flowId.isBlank()) {
                    result.add(flowId);
                }
            }
        }
        if (result.isEmpty() && defaultFlowId != null) {
            result.add(defaultFlowId);
        }
        return result;
    }

    private String safeString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
