/**
 * 子流程输出变量处理工具
 * 处理子流程节点的动态输出变量推断
 */

import {
  NodeType,
  SelectableVariable,
  VariableGroup,
  StartNodeConfig,
  SubflowNodeConfig,
  FlowGraphData,
  OutputVariableConfig,
  FlowDefinition,
} from "@/types";
import { FlowNode } from "@/store/flowStore";
import type { DataStructureResponse } from "@/services/dataStructureService";
import type { ConstantDefinitionResponse } from "@/services/constantService";
import type { StructureIndex } from "./types";
import { buildStructureIndex, getStructureByRef } from "./structureUtils";
import { buildNestedStructureVariables } from "./nodeOutputUtils";

type OutputVariableType = OutputVariableConfig["type"];

/**
 * 从表达式中提取变量 key
 */
const extractExpressionKey = (expression?: string) => {
  if (!expression) return null;
  const match = expression.match(/\{\{\s*([^}]+)\s*\}\}/);
  return match ? match[1].trim() : null;
};

/**
 * 获取结构的泛型参数名列表
 */
const getGenericParamNames = (
  structureRef: string | undefined,
  structureIndex: StructureIndex | undefined
): string[] => {
  if (!structureRef) return [];
  const normalizedRef = structureRef.toLowerCase();
  if (normalizedRef.includes("list") || normalizedRef.includes("set")) {
    return ["T"];
  }
  if (normalizedRef.includes("map")) {
    return ["K", "V"];
  }
  if (!structureIndex) return [];
  const structure = getStructureByRef(structureRef, structureIndex);
  if (!structure?.isGeneric || !structure.typeParameters?.length) {
    return [];
  }
  return structure.typeParameters
    .map((param) => param.name)
    .filter((name): name is string => Boolean(name));
};

/**
 * 应用类型绑定
 */
const applyTypeBinding = (
  binding: string | undefined,
  currentType: OutputVariableType | undefined
): { type: OutputVariableType | undefined; typeRef: string | undefined } => {
  if (!binding) return { type: currentType, typeRef: undefined };
  if (binding.startsWith("struct:") || binding.startsWith("generic:")) {
    return { type: "object", typeRef: binding };
  }
  if (
    binding === "string" ||
    binding === "number" ||
    binding === "boolean" ||
    binding === "array" ||
    binding === "object"
  ) {
    return { type: binding, typeRef: undefined };
  }
  return { type: currentType, typeRef: binding };
};

/**
 * 应用元素类型绑定
 */
const applyItemTypeBinding = (binding: string | undefined) => {
  if (!binding) return { itemTypeRef: undefined };
  if (binding.startsWith("struct:") || binding.startsWith("generic:")) {
    return { itemTypeRef: binding };
  }
  // 对于基础类型（string, number, boolean），也保留作为 itemTypeRef
  if (
    binding === "string" ||
    binding === "number" ||
    binding === "boolean"
  ) {
    return { itemTypeRef: binding };
  }
  return { itemTypeRef: undefined };
};

 
type BuildAvailableVariablesFn = (
  currentNodeId: string | undefined,
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  reusableFlows?: FlowDefinition[],
  dataStructures?: DataStructureResponse[],
  constants?: ConstantDefinitionResponse[],
  options?: { skipSubflow?: boolean }
) => VariableGroup[];

/**
 * 获取子流程的动态输出变量
 */
export const getSubflowOutputVariables = (
  node: FlowNode,
  reusableFlows: FlowDefinition[],
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  dataStructures?: DataStructureResponse[],
  buildAvailableVariablesFn?: BuildAvailableVariablesFn
): SelectableVariable[] => {
  const config = node.data.config as SubflowNodeConfig;
  if (!config?.subflowId) {
    return [];
  }

  // 从可复用流程列表中查找子流程
  const subflow = reusableFlows?.find((f) => f.id === config.subflowId);
  if (!subflow?.graphData) {
    return [];
  }

  try {
    const graphData: FlowGraphData = JSON.parse(subflow.graphData);
    // 收集所有结束节点的输出变量
    const endNodes = graphData.nodes.filter(
      (n) => n.data.nodeType === NodeType.END
    );

    if (endNodes.length === 0) {
      return [];
    }

    const outputVariablesMap = new Map<string, OutputVariableConfig>();
    endNodes.forEach((endNode) => {
      if (!endNode?.data.config) {
        return;
      }
      const endConfig = endNode.data.config as {
        outputVariables?: OutputVariableConfig[];
      };
      (endConfig.outputVariables || []).forEach((outputVar) => {
        if (!outputVar?.name || outputVariablesMap.has(outputVar.name)) {
          return;
        }
        outputVariablesMap.set(outputVar.name, outputVar);
      });
    });

    const outputVariables = Array.from(outputVariablesMap.values());
    const startNode = graphData.nodes.find(
      (n) => n.data.nodeType === NodeType.START
    );
    const subflowStartConfig = startNode?.data.config as
      | StartNodeConfig
      | undefined;
    const subflowInputs = subflowStartConfig?.variables || [];
    const structureIndex = dataStructures
      ? buildStructureIndex(dataStructures)
      : undefined;

    // 构建可用变量映射
    const availableMap = new Map<string, SelectableVariable>();
    if (buildAvailableVariablesFn) {
      const availableGroups = buildAvailableVariablesFn(
        node.id,
        nodes,
        edges,
        reusableFlows,
        dataStructures,
        undefined,
        { skipSubflow: true }
      );
      availableGroups.forEach((group) => {
        group.variables.forEach((item) => {
          availableMap.set(item.key, item);
        });
      });
    }

    // 构建泛型绑定映射
    const genericBindings = new Map<string, string>();
    config.inputMappings?.forEach((mapping) => {
      const targetName = mapping.targetVariable?.trim();
      if (!targetName) return;
      const targetInput = subflowInputs.find((input) => input.name === targetName);
      if (!targetInput?.structureRef) return;
      const paramNames = getGenericParamNames(targetInput.structureRef, structureIndex);
      if (paramNames.length === 0) return;
      const sourceKey = extractExpressionKey(mapping.sourceExpression);
      if (!sourceKey) return;
      const sourceVar = availableMap.get(sourceKey);
      if (!sourceVar) return;

      if (paramNames.length === 1) {
        const resolvedRef = sourceVar.itemTypeRef || sourceVar.typeRef;
        if (resolvedRef) {
          genericBindings.set(paramNames[0], resolvedRef);
          return;
        }
        if (sourceVar.type) {
          genericBindings.set(paramNames[0], sourceVar.type);
        }
        return;
      }
    });

    // 将子流程结束节点的输出变量映射为可选变量
    return outputVariables.flatMap((v) => {
      let typeRef = v.typeRef;
      let itemTypeRef = v.itemTypeRef;
      let resolvedType: OutputVariableType = v.type ?? "object";

      if (typeRef?.startsWith("generic:")) {
        const paramName = typeRef.replace("generic:", "");
        const binding = genericBindings.get(paramName);
        const applied = applyTypeBinding(binding, resolvedType);
        resolvedType = applied.type || resolvedType;
        typeRef = applied.typeRef;
      }
      if (itemTypeRef?.startsWith("generic:")) {
        const paramName = itemTypeRef.replace("generic:", "");
        const binding = genericBindings.get(paramName);
        const applied = applyItemTypeBinding(binding);
        itemTypeRef = applied.itemTypeRef;
      }

      const baseVariable: SelectableVariable = {
        key: `nodes.${node.id}.${v.name}`,
        name: v.name,
        label: v.label || v.name,
        type: resolvedType,
        typeRef,
        itemTypeRef,
        description: v.description || `来源: ${v.expression}`,
        group: node.data.label,
        sourceNodeId: node.id,
      };

      const nestedVariables = buildNestedStructureVariables(
        baseVariable,
        structureIndex || null
      );

      return [baseVariable, ...nestedVariables];
    });
  } catch {
    return [];
  }
};
