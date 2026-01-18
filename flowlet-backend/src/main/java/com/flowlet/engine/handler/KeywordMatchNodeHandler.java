package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.ExpressionResolver;
import com.flowlet.entity.FlowExecution;
import com.flowlet.entity.KeywordLibrary;
import com.flowlet.enums.NodeType;
import com.flowlet.mapper.FlowExecutionMapper;
import com.flowlet.mapper.KeywordLibraryMapper;
import com.flowlet.service.keyword.KeywordMatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class KeywordMatchNodeHandler implements NodeHandler {

    private final ExpressionResolver expressionResolver;
    private final FlowExecutionMapper flowExecutionMapper;
    private final KeywordLibraryMapper keywordLibraryMapper;
    private final KeywordMatchService keywordMatchService;

    @Override
    public String getNodeType() {
        return NodeType.KEYWORD_MATCH.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        if (node.getData() == null || node.getData().getConfig() == null) {
            return NodeResult.fail("关键词匹配节点配置为空");
        }

        Map<String, Object> config = node.getData().getConfig();
        String libraryId = safeString(config.get("libraryId"));
        String textExpression = safeString(config.get("textExpression"));

        if (libraryId == null || libraryId.isBlank()) {
            return NodeResult.fail("请选择关键词库");
        }
        if (textExpression == null || textExpression.isBlank()) {
            return NodeResult.fail("请输入文本表达式");
        }

        FlowExecution execution = flowExecutionMapper.selectById(context.getExecutionId());
        if (execution == null) {
            return NodeResult.fail("找不到执行上下文记录");
        }

        KeywordLibrary library = keywordLibraryMapper.selectById(libraryId);
        if (library == null) {
            return NodeResult.fail("关键词库不存在");
        }
        if (!library.getProjectId().equals(execution.getProjectId())) {
            return NodeResult.fail("无权访问该关键词库");
        }
        if (Boolean.FALSE.equals(library.getEnabled())) {
            return NodeResult.fail("关键词库未启用");
        }

        String text = expressionResolver.resolve(textExpression, context, String.class);
        if (text == null || text.isBlank()) {
            return NodeResult.success(defaultOutput(false));
        }

        KeywordMatchService.MatchResult matchResult = keywordMatchService.match(libraryId, text);

        Map<String, Object> output = new HashMap<>();
        output.put("hit", matchResult.isHit());
        output.put("actionLevel", matchResult.getActionLevel());
        output.put("matchedGroups", matchResult.getMatchedGroups());
        output.put("matchedTerms", matchResult.getMatchedTerms());
        return NodeResult.success(output);
    }

    private Map<String, Object> defaultOutput(boolean hit) {
        Map<String, Object> output = new HashMap<>();
        output.put("hit", hit);
        output.put("actionLevel", null);
        output.put("matchedGroups", new Object[0]);
        output.put("matchedTerms", new Object[0]);
        return output;
    }

    private String safeString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
