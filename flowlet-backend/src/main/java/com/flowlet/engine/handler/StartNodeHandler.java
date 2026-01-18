package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.enums.NodeType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 开始节点处理器
 */
@Slf4j
@Component
public class StartNodeHandler implements NodeHandler {

    @Override
    public String getNodeType() {
        return NodeType.START.getValue();
    }

    @Override
    public NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context) {
        log.info("执行开始节点: {}", node.getId());

        // 开始节点直接传递输入数据
        return NodeResult.success(context.getInputs());
    }
}
