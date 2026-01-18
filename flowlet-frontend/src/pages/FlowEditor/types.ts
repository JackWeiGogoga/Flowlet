import { Node, Edge } from "@xyflow/react";
import { FlowNodeData } from "@/types";

/**
 * 图形数据结构
 */
export interface GraphData {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

/**
 * DSL 节点定义
 */
export interface FlowDslNode {
  id?: string;
  type: string;
  label?: string;
  description?: string;
  config?: Record<string, unknown>;
  alias?: string;
  position?: { x: number; y: number };
}

/**
 * DSL 边定义
 */
export interface FlowDslEdge {
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

/**
 * DSL 完整结构
 */
export interface FlowDsl {
  meta?: {
    name?: string;
    description?: string;
    exportedAt?: string;
    version?: number;
  };
  nodes: FlowDslNode[];
  edges?: FlowDslEdge[];
}

/**
 * DSL 解析结果
 */
export interface DslParseResult {
  errors: string[];
  notes: string[];
  dsl: FlowDsl | null;
}
