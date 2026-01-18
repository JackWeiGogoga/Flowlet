/**
 * 图遍历工具
 * 用于流程图的节点遍历和关系查询
 */

import { FlowNode } from "@/store/flowStore";

/**
 * 获取前置节点
 * 通过边的关系递归查找当前节点的所有上游节点
 */
export const getPredecessorNodes = (
  currentNodeId: string,
  nodes: FlowNode[],
  edges: { source: string; target: string }[]
): FlowNode[] => {
  const predecessorIds = new Set<string>();
  const queue: string[] = [currentNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    edges.forEach((edge) => {
      if (edge.target === nodeId && !visited.has(edge.source)) {
        predecessorIds.add(edge.source);
        queue.push(edge.source);
      }
    });
  }

  return nodes.filter((node) => predecessorIds.has(node.id));
};
