import { NodeType } from "@/types";

/**
 * DSL 模板示例
 */
export const DSL_TEMPLATE = `{
  "nodes": [
    { "id": "start-1", "type": "start", "label": "开始" },
    {
      "id": "api-1",
      "type": "api",
      "label": "调用 Embedding API",
      "config": {
        "method": "POST",
        "url": "https://example.com/embed",
        "headers": { "Content-Type": "application/json" },
        "body": { "input": "{{inputs.text}}" }
      }
    },
    { "id": "end-1", "type": "end", "label": "结束" }
  ],
  "edges": [
    { "source": "start-1", "target": "api-1" },
    { "source": "api-1", "target": "end-1" }
  ]
}`;

/**
 * 支持的 DSL 节点类型集合
 */
export const DSL_NODE_TYPES = new Set(Object.values(NodeType));
