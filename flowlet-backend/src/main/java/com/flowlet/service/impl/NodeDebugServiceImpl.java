package com.flowlet.service.impl;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.dto.NodeDebugRequest;
import com.flowlet.dto.NodeDebugResult;
import com.flowlet.engine.ExecutionContext;
import com.flowlet.engine.handler.NodeHandler;
import com.flowlet.service.NodeDebugService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 节点调试服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NodeDebugServiceImpl implements NodeDebugService {

    private final List<NodeHandler> nodeHandlers;

    @Override
    @SuppressWarnings("unchecked")
    public NodeDebugResult debugNode(NodeDebugRequest request) {
        FlowGraphDTO.NodeDTO node = request.getNode();
        log.info("开始调试节点: nodeId={}, nodeType={}", node.getId(), 
                node.getData() != null ? node.getData().getNodeType() : "unknown");

        long startTime = System.currentTimeMillis();

        try {
            // 获取节点类型
            String nodeType = node.getData() != null ? node.getData().getNodeType() : null;
            if (nodeType == null) {
                return NodeDebugResult.fail("节点类型未定义", 0L);
            }

            // 查找对应的处理器
            NodeHandler handler = nodeHandlers.stream()
                    .filter(h -> h.getNodeType().equals(nodeType))
                    .findFirst()
                    .orElse(null);

            if (handler == null) {
                return NodeDebugResult.fail("未找到节点处理器: " + nodeType, 0L);
            }

            // 构建执行上下文
            ExecutionContext context = new ExecutionContext();
            context.setExecutionId("debug-" + System.currentTimeMillis());
            context.setFlowId("debug");

            // 设置模拟输入数据
            if (request.getMockInputs() != null) {
                // 将模拟输入设置为输入变量
                context.getInputs().putAll(request.getMockInputs());
            }

            // 执行节点
            NodeHandler.NodeResult result = handler.execute(node, context);

            long duration = System.currentTimeMillis() - startTime;

            if (result.isSuccess()) {
                // 将 output 转换为 Map
                Map<String, Object> outputMap = new HashMap<>();
                if (result.getOutput() instanceof Map) {
                    outputMap = (Map<String, Object>) result.getOutput();
                } else if (result.getOutput() != null) {
                    outputMap.put("result", result.getOutput());
                }
                
                NodeDebugResult debugResult = NodeDebugResult.success(outputMap, duration);
                
                // 提取请求详情和原始响应（如果有）
                Object requestDetails = outputMap.get("request");
                if (requestDetails instanceof Map) {
                    debugResult.setRequestDetails((Map<String, Object>) requestDetails);
                }
                Object response = outputMap.get("response");
                if (response != null) {
                    debugResult.setRawResponse(response);
                }
                
                log.info("节点调试成功: nodeId={}, duration={}ms", node.getId(), duration);
                return debugResult;
            } else {
                log.warn("节点调试失败: nodeId={}, error={}", node.getId(), result.getErrorMessage());
                return NodeDebugResult.fail(result.getErrorMessage(), duration);
            }

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("节点调试异常: nodeId={}, error={}", node.getId(), e.getMessage(), e);
            return NodeDebugResult.fail("执行异常: " + e.getMessage(), duration);
        }
    }
}
