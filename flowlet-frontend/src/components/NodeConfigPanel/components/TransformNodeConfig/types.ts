import type { FlowNodeData } from "@/types";

/**
 * 字段映射项
 */
export interface FieldMapping {
  id: string;
  source?: string; // 源字段路径
  target: string; // 目标字段名
  expression?: string; // 可选的转换表达式
  regexMode?: "none" | "replace" | "extract" | "match";
  regexPattern?: string;
  regexFlags?: string;
  regexReplace?: string;
  regexGroup?: string;
}

/**
 * 数据转换模式
 */
export type TransformMode = "simple" | "mapping" | "advanced";

/**
 * 上游节点数据类型
 */
export interface UpstreamNodeData {
  id: string;
  label: string;
  type: string;
  sampleData: Record<string, unknown> | null;
}

/**
 * 扩展的 FlowNodeData 类型（包含调试输出）
 */
export interface FlowNodeDataWithDebug extends FlowNodeData {
  debugOutput?: Record<string, unknown>;
}

/**
 * 预览数据类型
 */
export type PreviewData = Record<string, unknown> | { error: string } | null;
