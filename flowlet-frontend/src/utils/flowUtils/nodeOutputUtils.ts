/**
 * 节点输出变量处理工具
 * 处理各类节点的输出变量定义和动态字段
 */

import {
  NodeType,
  SelectableVariable,
  NODE_OUTPUT_VARIABLES,
  OutputVariable,
  LlmNodeConfig,
  VectorStoreNodeConfig,
  JsonParserOutputField,
} from "@/types";
import { FlowNode } from "@/store/flowStore";
import type {
  StructureIndex,
  SchemaField,
  ResolveContext,
  OutputSchemaConfigPayload,
} from "./types";
import {
  buildStructureIndex,
  getStructureByRef,
  flattenStructureFields,
  getStructureFieldsByRef,
} from "./structureUtils";

/**
 * 构建嵌套结构变量
 * 将结构体的嵌套字段展平为可选变量列表
 */
export const buildNestedStructureVariables = (
  base: SelectableVariable,
  index: StructureIndex | null
): SelectableVariable[] => {
  const structureRef =
    base.type === "array" ? base.itemTypeRef || base.typeRef : base.typeRef;
  if (!structureRef) {
    return [];
  }

  const fields = getStructureFieldsByRef(structureRef, index);
  if (fields.length === 0) {
    return [];
  }

  return fields.map((field) => ({
    key: `${base.key}.${field.path}`,
    name: `${base.name}.${field.path}`,
    label: `${base.name}.${field.path}`,
    type: field.type,
    typeRef: field.typeRef,
    itemTypeRef: field.itemTypeRef,
    description: field.description || `${base.label || base.name} 字段`,
    group: base.group,
    sourceNodeId: base.sourceNodeId,
  }));
};

/**
 * 获取节点输出 Schema 字段
 * 根据节点配置的输出结构定义，解析出所有可用字段
 */
export const getNodeOutputSchemaFields = (
  node: FlowNode,
  index: StructureIndex
): SchemaField[] => {
  const config = node.data.config as OutputSchemaConfigPayload | undefined;
  if (!config?.enableOutputSchema || !config.outputStructureId) {
    return [];
  }

  if (config.outputStructureId.startsWith("generic:")) {
    return [];
  }

  const structure = index.byId.get(config.outputStructureId);
  if (!structure) {
    return [];
  }

  const genericParamNames = new Set(
    (structure.typeParameters || []).map((param) => param.name)
  );

  const context: ResolveContext = {
    index,
    genericTypeArgs: config.genericTypeArgs,
    genericParamNames,
    visited: new Set([structure.id]),
  };

  if (
    config.outputCollectionType === "list" ||
    config.outputCollectionType === "set"
  ) {
    return flattenStructureFields(structure.fields || [], context);
  }

  if (config.outputCollectionType === "map") {
    return [];
  }

  return flattenStructureFields(structure.fields || [], context);
};

/**
 * 获取节点的输出变量配置（包含动态字段）
 */
export const getNodeOutputFields = (node: FlowNode): OutputVariable[] => {
  const nodeType = node.data.nodeType;
  const staticOutputs = NODE_OUTPUT_VARIABLES[nodeType] || [];

  if (nodeType === NodeType.VECTOR_STORE) {
    const config = node.data.config as VectorStoreNodeConfig | undefined;
    const operation = config?.operation;
    const scoreThreshold = config?.scoreThreshold;
    const hasScoreThreshold =
      typeof scoreThreshold === "number" ||
      (typeof scoreThreshold === "string" && scoreThreshold.trim().length > 0);
    let filteredOutputs = staticOutputs;

    if (operation === "search") {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "count"
      );
      if (!hasScoreThreshold) {
        filteredOutputs = filteredOutputs.filter(
          (output) => output.name !== "matchedIds"
        );
      }
    } else if (operation === "upsert" || operation === "delete") {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "matches" && output.name !== "matchedIds"
      );
    } else if (!hasScoreThreshold) {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "matchedIds"
      );
    }

    return filteredOutputs;
  }

  if (nodeType !== NodeType.LLM) {
    const config = node.data.config as OutputSchemaConfigPayload | undefined;
    const collectionType = config?.outputCollectionType;
    if (collectionType === "list" || collectionType === "set") {
      const targetName = nodeType === NodeType.API ? "body" : "result";
      return staticOutputs.map((output) =>
        output.name === targetName
          ? { ...output, type: "array" as const }
          : output
      );
    }
    return staticOutputs;
  }

  const config = node.data.config as LlmNodeConfig | undefined;
  const jsonFields =
    config?.outputJsonEnabled && Array.isArray(config.outputJsonFields)
      ? config.outputJsonFields
      : [];

  if (jsonFields.length === 0) {
    return staticOutputs;
  }

  const existing = new Set(staticOutputs.map((output) => output.name));
  const dynamicOutputs: OutputVariable[] = jsonFields
    .map((field) => field?.trim())
    .filter((field): field is string => Boolean(field))
    .filter((field) => !existing.has(field))
    .map((field) => ({
      name: field,
      label: field,
      type: "object" as const,
      description: "解析自 JSON 输出",
    }));

  return [...dynamicOutputs, ...staticOutputs];
};

/**
 * 将 JSON 解析器的嵌套输出字段展平为可选变量列表
 * 递归遍历时构建完整路径
 */
export const flattenJsonParserOutputFields = (
  fields: JsonParserOutputField[],
  nodeId: string,
  nodeLabel: string
): SelectableVariable[] => {
  const result: SelectableVariable[] = [];

  const flatten = (items: JsonParserOutputField[], parentPath: string) => {
    items.forEach((field) => {
      // 构建完整路径：父路径 + 当前字段名
      const fullPath = parentPath ? `${parentPath}.${field.path}` : field.path;

      // 添加当前字段
      result.push({
        key: `nodes.${nodeId}.${fullPath}`,
        name: fullPath,
        label: fullPath,
        type: field.type,
        description: field.description || `JSON 解析输出字段`,
        group: nodeLabel,
        sourceNodeId: nodeId,
      });

      // 递归处理子字段
      if (field.children && field.children.length > 0) {
        flatten(field.children, fullPath);
      }
    });
  };

  flatten(fields, "");
  return result;
};

// 重新导出常用的结构工具函数
export { buildStructureIndex, getStructureByRef };
