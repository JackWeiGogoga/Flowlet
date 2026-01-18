package com.flowlet.service;

import com.flowlet.dto.NodeDebugRequest;
import com.flowlet.dto.NodeDebugResult;

/**
 * 节点调试服务
 */
public interface NodeDebugService {

    /**
     * 执行单个节点（用于调试）
     *
     * @param request 调试请求
     * @return 调试结果
     */
    NodeDebugResult debugNode(NodeDebugRequest request);
}
