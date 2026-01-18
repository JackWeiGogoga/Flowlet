package com.flowlet.engine.handler;

import com.flowlet.dto.FlowGraphDTO;
import com.flowlet.engine.ExecutionContext;

/**
 * 节点处理器接口
 */
public interface NodeHandler {

    /**
     * 获取处理器支持的节点类型
     */
    String getNodeType();

    /**
     * 执行节点
     *
     * @param node 节点定义
     * @param context 执行上下文
     * @return 节点执行结果
     */
    NodeResult execute(FlowGraphDTO.NodeDTO node, ExecutionContext context);

    /**
     * 节点执行结果
     */
    class NodeResult {
        private boolean success;
        private Object output;
        private String errorMessage;
        private boolean needPause; // 是否需要暂停等待回调
        private String callbackKey; // 回调唯一标识
        private Object executionData; // 执行过程数据（用于在等待回调时展示请求信息等）
        private boolean skipped; // 是否被跳过（因执行条件不满足）

        public static NodeResult success(Object output) {
            NodeResult result = new NodeResult();
            result.success = true;
            result.output = output;
            return result;
        }

        public static NodeResult fail(String errorMessage) {
            NodeResult result = new NodeResult();
            result.success = false;
            result.errorMessage = errorMessage;
            return result;
        }

        public static NodeResult pause(String callbackKey) {
            NodeResult result = new NodeResult();
            result.success = true;
            result.needPause = true;
            result.callbackKey = callbackKey;
            return result;
        }

        /**
         * 暂停并携带执行过程数据
         * @param callbackKey 回调唯一标识
         * @param executionData 执行过程数据（如请求URL、请求体、同步响应等）
         */
        public static NodeResult pause(String callbackKey, Object executionData) {
            NodeResult result = new NodeResult();
            result.success = true;
            result.needPause = true;
            result.callbackKey = callbackKey;
            result.executionData = executionData;
            return result;
        }

        /**
         * 等待状态 - 用于子流程等待场景
         * @param message 等待原因说明
         * @param executionData 相关数据
         */
        public static NodeResult waiting(String message, Object executionData) {
            NodeResult result = new NodeResult();
            result.success = true;
            result.needPause = true;
            result.errorMessage = message; // 复用字段存储等待原因
            result.executionData = executionData;
            return result;
        }

        /**
         * 跳过节点 - 因执行条件不满足
         * @param reason 跳过原因
         */
        public static NodeResult skipped(String reason) {
            NodeResult result = new NodeResult();
            result.success = true;
            result.skipped = true;
            result.errorMessage = reason; // 复用字段存储跳过原因
            return result;
        }

        // Getters
        public boolean isSuccess() {
            return success;
        }

        public Object getOutput() {
            return output;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public boolean isNeedPause() {
            return needPause;
        }

        public String getCallbackKey() {
            return callbackKey;
        }

        public Object getExecutionData() {
            return executionData;
        }

        public boolean isSkipped() {
            return skipped;
        }
    }
}
