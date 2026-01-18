package com.flowlet.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 流程图数据结构
 */
@Data
public class FlowGraphDTO {

    /**
     * 节点列表
     */
    private List<NodeDTO> nodes;

    /**
     * 边列表 (连接关系)
     */
    private List<EdgeDTO> edges;

    /**
     * 节点定义
     */
    @Data
    public static class NodeDTO {
        /**
         * 节点唯一标识
         */
        private String id;

        /**
         * ReactFlow 节点类型 (例如: custom)
         */
        private String type;

        /**
         * 节点位置
         */
        private Position position;

        /**
         * 节点数据 (包含 label, nodeType, config 等)
         */
        private NodeData data;

        /**
         * 测量尺寸
         */
        private Measured measured;

        /**
         * 是否选中
         */
        private Boolean selected;

        /**
         * 是否拖拽中
         */
        private Boolean dragging;

        @Data
        public static class Position {
            private Double x;
            private Double y;
        }

        @Data
        public static class NodeData {
            /**
             * 节点显示名称
             */
            private String label;

            /**
             * 实际节点类型: start, end, api, kafka, condition, transform
             */
            private String nodeType;

            /**
             * 节点描述
             */
            private String description;

            /**
             * 节点配置
             */
            private Map<String, Object> config;

            /**
             * 调试输出数据 (测试执行的结果)
             */
            private Object debugOutput;
        }

        @Data
        public static class Measured {
            private Integer width;
            private Integer height;
        }
    }

    /**
     * 边定义 (节点之间的连接)
     */
    @Data
    public static class EdgeDTO {
        /**
         * 边唯一标识
         */
        private String id;

        /**
         * 源节点ID
         */
        private String source;

        /**
         * 目标节点ID
         */
        private String target;

        /**
         * 源节点输出端口
         */
        private String sourceHandle;

        /**
         * 目标节点输入端口
         */
        private String targetHandle;

        /**
         * 边的标签 (用于条件分支)
         */
        private String label;

        /**
         * 边的类型 (例如: smoothstep)
         */
        private String type;

        /**
         * 是否动画
         */
        private Boolean animated;
    }
}
