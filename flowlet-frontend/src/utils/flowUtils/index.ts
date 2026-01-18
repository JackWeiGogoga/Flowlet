/**
 * flowUtils 模块入口
 * 
 * 该模块提供流程变量处理的核心工具函数，包括：
 * - 数据结构索引与查询
 * - 图遍历工具
 * - 节点输出变量处理
 * - 子流程输出变量推断
 * - 可用变量构建
 */

// 类型导出
export type {
  TransformMapping,
  GenericTypeArg,
  GenericTypeArgs,
  OutputSchemaConfigPayload,
  StructureIndex,
  SchemaField,
  ResolveContext,
  ResolvedType,
} from "./types";

// 数据结构工具
export {
  buildStructureIndex,
  getStructureByRef,
  resolveTypeString,
  resolveGenericParamType,
  resolveFieldType,
  flattenStructureFields,
  getStructureFieldsByRef,
  isListType,
} from "./structureUtils";

// 图遍历工具
export { getPredecessorNodes } from "./graphUtils";

// 节点输出工具
export {
  buildNestedStructureVariables,
  getNodeOutputSchemaFields,
  getNodeOutputFields,
  flattenJsonParserOutputFields,
} from "./nodeOutputUtils";

// 子流程工具
export { getSubflowOutputVariables } from "./subflowUtils";

// 核心变量构建器
export { buildAvailableVariables } from "./variableBuilder";
