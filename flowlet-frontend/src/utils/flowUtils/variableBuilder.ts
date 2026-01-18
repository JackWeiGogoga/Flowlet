/**
 * 可用变量构建器
 * 核心函数：收集用户输入、全局上下文、前置节点输出等变量
 */

import {
  NodeType,
  SelectableVariable,
  VariableGroup,
  NODE_OUTPUT_VARIABLES,
  StartNodeConfig,
  VariableType,
  FlowDefinition,
  VariableAssignerConfig,
  AssignmentItem,
  JsonParserNodeConfig,
  CodeNodeConfig,
  ForEachNodeConfig,
} from "@/types";
import { FlowNode } from "@/store/flowStore";
import type { DataStructureResponse } from "@/services/dataStructureService";
import type { ConstantDefinitionResponse } from "@/services/constantService";
import type { StructureIndex, OutputSchemaConfigPayload, TransformMapping } from "./types";
import { buildStructureIndex, getStructureByRef } from "./structureUtils";
import { getPredecessorNodes } from "./graphUtils";
import {
  buildNestedStructureVariables,
  getNodeOutputSchemaFields,
  getNodeOutputFields,
  flattenJsonParserOutputFields,
} from "./nodeOutputUtils";
import { getSubflowOutputVariables } from "./subflowUtils";

/**
 * 构建可用变量列表
 * 收集用户输入、全局上下文、前置节点输出等变量
 */
export const buildAvailableVariables = (
  currentNodeId: string | undefined,
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  reusableFlows?: FlowDefinition[],
  dataStructures?: DataStructureResponse[],
  constants?: ConstantDefinitionResponse[],
  options?: { skipSubflow?: boolean }
): VariableGroup[] => {
  const groups: VariableGroup[] = [];
  const structureIndex =
    dataStructures && dataStructures.length > 0
      ? buildStructureIndex(dataStructures)
      : null;

  // 添加开始节点的输入变量
  buildStartNodeVariables(nodes, structureIndex, groups);

  // 添加全局上下文变量
  buildGlobalContextVariables(groups);

  // 添加常量变量（项目级与流程级）
  buildConstantVariables(constants, groups);

  // 收集别名变量组
  buildAliasVariables(nodes, structureIndex, groups);

  // 收集全流程变量
  if (currentNodeId) {
    buildFlowVariables(currentNodeId, nodes, edges, groups);
  }

  // 添加前置节点的输出变量
  if (currentNodeId) {
    buildPredecessorNodeVariables(
      currentNodeId,
      nodes,
      edges,
      reusableFlows,
      dataStructures,
      structureIndex,
      options,
      groups
    );
  }

  // ForEach 迭代变量
  if (currentNodeId) {
    buildForEachIterationVariables(currentNodeId, nodes, structureIndex, groups);
  }

  return groups;
};

/**
 * 构建开始节点的输入变量
 */
const buildStartNodeVariables = (
  nodes: FlowNode[],
  structureIndex: StructureIndex | null,
  groups: VariableGroup[]
): void => {
  const startNode = nodes.find((n) => n.data.nodeType === NodeType.START);
  if (!startNode) return;

  const startConfig = startNode.data.config as StartNodeConfig | undefined;
  const inputVariables = startConfig?.variables || [];
  if (inputVariables.length === 0) return;

  groups.push({
    name: "用户输入",
    variables: inputVariables.flatMap((v) => {
      const baseVariable: SelectableVariable = {
        key: `input.${v.name}`,
        name: v.name,
        label: v.label,
        type: v.type,
        description: v.description,
        group: "用户输入",
      };

      if (
        v.type !== VariableType.STRUCTURE ||
        !v.structureRef ||
        !structureIndex
      ) {
        return [baseVariable];
      }

      const structure = getStructureByRef(v.structureRef, structureIndex);
      if (!structure) {
        const nextBase: SelectableVariable = {
          ...baseVariable,
          type: "object",
        };
        return [nextBase];
      }

      const structureName = structure.name?.toLowerCase();
      let nextBase: SelectableVariable;
      if (structureName === "list" || structureName === "set") {
        const paramName = structure.typeParameters?.[0]?.name;
        nextBase = {
          ...baseVariable,
          type: "array",
          itemTypeRef: paramName ? `generic:${paramName}` : undefined,
        };
      } else if (structureName === "map") {
        const paramName =
          structure.typeParameters?.[1]?.name ||
          structure.typeParameters?.[0]?.name;
        nextBase = {
          ...baseVariable,
          type: "object",
          typeRef: paramName ? `generic:${paramName}` : undefined,
        };
      } else {
        nextBase = {
          ...baseVariable,
          type: "object",
          typeRef: structure.id ? `struct:${structure.id}` : undefined,
        };
      }

      const nestedVariables = buildNestedStructureVariables(
        nextBase,
        structureIndex
      );

      return [nextBase, ...nestedVariables];
    }),
  });
};

/**
 * 构建全局上下文变量
 */
const buildGlobalContextVariables = (groups: VariableGroup[]): void => {
  groups.push({
    name: "全局上下文",
    variables: [
      {
        key: "context.executionId",
        name: "executionId",
        label: "执行ID",
        type: "string",
        description: "当前流程执行的唯一标识",
        group: "全局上下文",
      },
      {
        key: "context.flowId",
        name: "flowId",
        label: "流程ID",
        type: "string",
        description: "当前流程定义的ID",
        group: "全局上下文",
      },
      {
        key: "context.timestamp",
        name: "timestamp",
        label: "时间戳",
        type: "number",
        description: "当前执行时间戳",
        group: "全局上下文",
      },
    ],
  });
};

/**
 * 构建常量变量（项目级与流程级）
 */
const buildConstantVariables = (
  constants: ConstantDefinitionResponse[] | undefined,
  groups: VariableGroup[]
): void => {
  if (!constants || constants.length === 0) return;

  const flowConstantNames = new Set(
    constants
      .filter((item) => item.flowId)
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name))
  );

  const toSelectable = (groupName: string) =>
    constants
      .filter((item) => (groupName === "项目常量" ? !item.flowId : item.flowId))
      .filter((item) => item.name && item.name.trim())
      .filter((item) =>
        groupName === "项目常量" ? !flowConstantNames.has(item.name) : true
      )
      .map((item) => ({
        key: `const.${item.name}`,
        name: item.name,
        label: item.name,
        type: item.valueType || "string",
        description: item.description,
        group: groupName,
      }));

  const projectConstants = toSelectable("项目常量");
  if (projectConstants.length > 0) {
    groups.push({
      name: "项目常量",
      variables: projectConstants,
    });
  }

  const flowConstants = toSelectable("流程常量");
  if (flowConstants.length > 0) {
    groups.push({
      name: "流程常量",
      variables: flowConstants,
    });
  }
};

/**
 * 构建别名变量组
 */
const buildAliasVariables = (
  nodes: FlowNode[],
  structureIndex: StructureIndex | null,
  groups: VariableGroup[]
): void => {
  const aliasNodeMap: Map<string, FlowNode[]> = new Map();

  nodes.forEach((node) => {
    if (node.data.nodeType === NodeType.START) return;

    const outputAlias = node.data.config?.outputAlias as string | undefined;
    if (outputAlias && outputAlias.trim()) {
      const alias = outputAlias.trim();
      if (!aliasNodeMap.has(alias)) {
        aliasNodeMap.set(alias, []);
      }
      aliasNodeMap.get(alias)!.push(node);
    }
  });

  // 为每个唯一的别名创建变量组
  aliasNodeMap.forEach((aliasNodes, alias) => {
    const nodeLabels = aliasNodes.map((n) => n.data.label).join("、");
    const representativeNode = aliasNodes[0];
    const outputFields = getNodeOutputFields(representativeNode);
    const schemaFields = structureIndex
      ? getNodeOutputSchemaFields(representativeNode, structureIndex)
      : [];
    const hasBodyOutput = outputFields.some((field) => field.name === "body");
    const hasResultOutput = outputFields.some((field) => field.name === "result");
    const schemaPrefix = hasBodyOutput
      ? "body"
      : hasResultOutput
      ? "result"
      : "";

    if (outputFields.length > 0 || schemaFields.length > 0) {
      const aliasVariables: SelectableVariable[] = [];
      const usedNames = new Set<string>();

      schemaFields.forEach((field) => {
        const path = schemaPrefix ? `${schemaPrefix}.${field.path}` : field.path;
        aliasVariables.push({
          key: `${alias}.${path}`,
          name: path,
          label: path,
          type: field.type,
          typeRef: field.typeRef,
          itemTypeRef: field.itemTypeRef,
          description: `${field.description || "输出结构字段"} (来源: ${nodeLabels})`,
          group: `🏷️ ${alias}`,
        });
        usedNames.add(path);
      });

      outputFields.forEach((field) => {
        if (usedNames.has(field.name)) return;
        const description = field.description
          ? `${field.description} (来源: ${nodeLabels})`
          : `来源: ${nodeLabels}`;
        aliasVariables.push({
          key: `${alias}.${field.name}`,
          name: field.name,
          label: field.label,
          type: field.type,
          description,
          group: `🏷️ ${alias}`,
        });
      });

      groups.push({
        name: `🏷️ ${alias}`,
        variables: aliasVariables,
      });
    }
  });
};

/**
 * 构建全流程变量
 */
const buildFlowVariables = (
  currentNodeId: string,
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  groups: VariableGroup[]
): void => {
  const predecessors = getPredecessorNodes(currentNodeId, nodes, edges);

  // 收集所有上游赋值节点中定义的变量（去重，保留最后一次赋值的类型）
  const flowVariables = new Map<
    string,
    { type: string; sourceNodeLabel: string }
  >();

  predecessors.forEach((node) => {
    if (node.data.nodeType === NodeType.VARIABLE_ASSIGNER) {
      const config = node.data.config as VariableAssignerConfig | undefined;
      if (config?.assignments) {
        config.assignments.forEach((assignment: AssignmentItem) => {
          const varName = assignment.variableName?.trim();
          if (varName) {
            // 根据模式确定变量类型
            let varType = "unknown";
            if (assignment.mode === "set") {
              varType = assignment.valueType || "string";
            } else if (assignment.mode === "assign") {
              // 优先使用完整类型（如 List<ContentVO>）
              varType = assignment.sourceFullType || assignment.sourceType || "unknown";
            } else if (assignment.mode === "transform") {
              // transform 模式需要根据操作推断结果类型
              varType = inferTransformResultType(assignment);
            }
            // 后面的赋值会覆盖前面的（如果变量名相同）
            flowVariables.set(varName, {
              type: varType,
              sourceNodeLabel: node.data.label,
            });
          }
        });
      }
    }
  });

  // 如果有全流程变量，添加为一个独立的变量组
  if (flowVariables.size > 0) {
    const variables: SelectableVariable[] = [];
    flowVariables.forEach((info, varName) => {
      variables.push({
        key: `var.${varName}`,
        name: varName,
        label: varName,
        type: info.type,
        description: `全流程变量（来源: ${info.sourceNodeLabel}）`,
        group: "全流程变量",
      });
    });

    groups.push({
      name: "全流程变量",
      variables,
    });
  }
};

/**
 * 推断 transform 模式的结果类型
 */
const inferTransformResultType = (assignment: AssignmentItem): string => {
  const op = assignment.operation;
  const elementOps = ["get_first", "get_last", "get_index"];
  if (op && elementOps.includes(op)) {
    // 元素提取操作：使用 elementType
    return assignment.elementType || "object";
  } else if (op === "length") {
    return "number";
  } else if (op === "join") {
    return "string";
  } else if (op === "keys" || op === "values" || op === "slice" || 
             op === "reverse" || op === "unique" || op === "append" ||
             op === "remove_first" || op === "remove_last") {
    return "array";
  } else if (op === "not") {
    return "boolean";
  } else if (["add", "subtract", "multiply", "divide", "round", "floor", "ceil", "abs"].includes(op || "")) {
    return "number";
  } else if (["trim", "uppercase", "lowercase", "regex_replace", "regex_extract"].includes(op || "")) {
    return "string";
  } else {
    return assignment.sourceType || "unknown";
  }
};

/**
 * 构建前置节点的输出变量
 */
const buildPredecessorNodeVariables = (
  currentNodeId: string,
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  reusableFlows: FlowDefinition[] | undefined,
  dataStructures: DataStructureResponse[] | undefined,
  structureIndex: StructureIndex | null,
  options: { skipSubflow?: boolean } | undefined,
  groups: VariableGroup[]
): void => {
  const predecessors = getPredecessorNodes(currentNodeId, nodes, edges);

  predecessors.forEach((node) => {
    // 跳过赋值节点（它不产生节点输出，其变量已在"全流程变量"中展示）
    if (node.data.nodeType === NodeType.VARIABLE_ASSIGNER) return;
    if (node.data.nodeType === NodeType.START) return;

    let outputs: SelectableVariable[] = [];

    // 特殊处理：转换节点使用动态字段
    if (node.data.nodeType === NodeType.TRANSFORM) {
      outputs = buildTransformNodeOutputs(node);
    } else if (node.data.nodeType === NodeType.JSON_PARSER) {
      outputs = buildJsonParserNodeOutputs(node);
    } else if (node.data.nodeType === NodeType.SUBFLOW) {
      if (options?.skipSubflow) {
        return;
      }
      outputs = buildSubflowNodeOutputs(
        node,
        nodes,
        edges,
        reusableFlows,
        dataStructures
      );
    } else {
      outputs = buildStandardNodeOutputs(node, structureIndex);
    }

    if (outputs.length > 0) {
      groups.push({
        name: node.data.label,
        variables: outputs,
      });
    }
  });
};

/**
 * 构建转换节点的输出变量
 */
const buildTransformNodeOutputs = (node: FlowNode): SelectableVariable[] => {
  const mappings = node.data.config?.mappings as TransformMapping[] | undefined;
  if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
    return [];
  }

  return mappings
    .filter((m: TransformMapping) => m.target)
    .map((m: TransformMapping) => ({
      key: `nodes.${node.id}.${m.target}`,
      name: m.target,
      label: m.target,
      type: "dynamic",
      description: m.source
        ? `来源: ${m.source}`
        : m.expression
        ? `表达式: ${m.expression}`
        : "数据转换输出字段",
      group: node.data.label,
      sourceNodeId: node.id,
    }));
};

/**
 * 构建 JSON 解析器节点的输出变量
 */
const buildJsonParserNodeOutputs = (node: FlowNode): SelectableVariable[] => {
  const config = node.data.config as JsonParserNodeConfig | undefined;
  if (!config?.outputFields || config.outputFields.length === 0) {
    return [];
  }

  return flattenJsonParserOutputFields(
    config.outputFields,
    node.id,
    node.data.label
  );
};

/**
 * 构建子流程节点的输出变量
 */
const buildSubflowNodeOutputs = (
  node: FlowNode,
  nodes: FlowNode[],
  edges: { source: string; target: string }[],
  reusableFlows: FlowDefinition[] | undefined,
  dataStructures: DataStructureResponse[] | undefined
): SelectableVariable[] => {
  const dynamicOutputs = getSubflowOutputVariables(
    node,
    reusableFlows || [],
    nodes,
    edges,
    dataStructures,
    buildAvailableVariables // 传递自身引用用于递归调用
  );

  // 添加元数据字段
  const metaOutputs = NODE_OUTPUT_VARIABLES[NodeType.SUBFLOW] || [];
  const metaVariables = metaOutputs.map((output) => ({
    key: `nodes.${node.id}.${output.name}`,
    name: output.name,
    label: output.label,
    type: output.type,
    description: output.description,
    group: node.data.label,
    sourceNodeId: node.id,
  }));

  return [...dynamicOutputs, ...metaVariables];
};

/**
 * 构建标准节点的输出变量
 */
const buildStandardNodeOutputs = (
  node: FlowNode,
  structureIndex: StructureIndex | null
): SelectableVariable[] => {
  const codeConfig =
    node.data.nodeType === NodeType.CODE
      ? (node.data.config as CodeNodeConfig | undefined)
      : undefined;

  if (codeConfig?.outputMode === "custom") {
    return buildCodeNodeCustomOutputs(node, codeConfig);
  }

  let staticOutputs = getNodeOutputFields(node);
  const schemaFields = structureIndex
    ? getNodeOutputSchemaFields(node, structureIndex)
    : [];
  const outputSchemaConfig = node.data.config as OutputSchemaConfigPayload | undefined;
  const genericOutputRef =
    outputSchemaConfig?.enableOutputSchema &&
    outputSchemaConfig.outputStructureId?.startsWith("generic:")
      ? outputSchemaConfig.outputStructureId
      : undefined;

  // 特殊处理：Kafka/API 节点根据 waitForCallback 配置过滤输出变量
  if (
    node.data.nodeType === NodeType.KAFKA ||
    node.data.nodeType === NodeType.API
  ) {
    const waitForCallback = node.data.config?.waitForCallback as boolean | undefined;
    if (!waitForCallback) {
      // 未开启等待回调时，过滤掉回调相关字段
      staticOutputs = staticOutputs.filter(
        (output) =>
          output.name !== "callbackData" && output.name !== "callbackKey"
      );
    }
  }

  const variables: SelectableVariable[] = [];
  const usedNames = new Set<string>();

  if (schemaFields.length > 0) {
    const hasBodyOutput = staticOutputs.some((output) => output.name === "body");
    const hasResultOutput = staticOutputs.some((output) => output.name === "result");
    const schemaPrefix = hasBodyOutput
      ? "body"
      : hasResultOutput
      ? "result"
      : "";
    schemaFields.forEach((field) => {
      const name = schemaPrefix ? `${schemaPrefix}.${field.path}` : field.path;
      variables.push({
        key: `nodes.${node.id}.${name}`,
        name,
        label: name,
        type: field.type,
        typeRef: field.typeRef,
        itemTypeRef: field.itemTypeRef,
        description: field.description || "输出结构字段",
        group: node.data.label,
        sourceNodeId: node.id,
      });
      usedNames.add(name);
    });
  }

  staticOutputs.forEach((output) => {
    if (usedNames.has(output.name)) {
      return;
    }
    if (genericOutputRef) {
      const hasBodyOutput = staticOutputs.some((item) => item.name === "body");
      const hasResultOutput = staticOutputs.some((item) => item.name === "result");
      const schemaRootName = hasBodyOutput
        ? "body"
        : hasResultOutput
        ? "result"
        : "";
      if (schemaRootName && output.name === schemaRootName) {
        const nextOutput: SelectableVariable = {
          key: `nodes.${node.id}.${output.name}`,
          name: output.name,
          label: output.label,
          type: outputSchemaConfig?.outputCollectionType ? "array" : output.type,
          description: output.description,
          group: node.data.label,
          sourceNodeId: node.id,
        };
        if (
          outputSchemaConfig?.outputCollectionType === "list" ||
          outputSchemaConfig?.outputCollectionType === "set"
        ) {
          nextOutput.type = "array";
          nextOutput.itemTypeRef = genericOutputRef;
        } else if (outputSchemaConfig?.outputCollectionType === "map") {
          nextOutput.type = "object";
          nextOutput.typeRef = genericOutputRef;
        } else {
          nextOutput.type = "object";
          nextOutput.typeRef = genericOutputRef;
        }
        variables.push(nextOutput);
        return;
      }
    }
    variables.push({
      key: `nodes.${node.id}.${output.name}`,
      name: output.name,
      label: output.label,
      type: output.type,
      description: output.description,
      group: node.data.label,
      sourceNodeId: node.id,
    });
  });

  return variables;
};

/**
 * 构建代码节点的自定义输出变量
 */
const buildCodeNodeCustomOutputs = (
  node: FlowNode,
  codeConfig: CodeNodeConfig
): SelectableVariable[] => {
  const customOutputs = (codeConfig.customOutputs || []).filter(
    (output) => output.name && output.name.trim()
  );
  const customNames = new Set(customOutputs.map((output) => output.name));
  const customVariables: SelectableVariable[] = customOutputs.map((output) => ({
    key: `nodes.${node.id}.result.${output.name}`,
    name: output.name,
    label: output.label || output.name,
    type: output.type,
    description: output.description || "自定义输出字段",
    group: node.data.label,
    sourceNodeId: node.id,
  }));

  const metaOutputs = NODE_OUTPUT_VARIABLES[NodeType.CODE] || [];
  const metaVariables = metaOutputs
    .filter((output) => !customNames.has(output.name))
    .map((output) => ({
      key: `nodes.${node.id}.${output.name}`,
      name: output.name,
      label: output.label,
      type: output.type,
      description: output.description,
      group: node.data.label,
      sourceNodeId: node.id,
    }));

  return [...customVariables, ...metaVariables];
};

/**
 * 构建 ForEach 迭代变量
 */
const buildForEachIterationVariables = (
  currentNodeId: string,
  nodes: FlowNode[],
  structureIndex: StructureIndex | null,
  groups: VariableGroup[]
): void => {
  const currentNode = nodes.find((node) => node.id === currentNodeId);
  if (currentNode?.data.nodeType !== NodeType.FOR_EACH) return;

  const config = currentNode.data.config as ForEachNodeConfig | undefined;
  const itemsExpression = config?.itemsExpression?.trim();
  if (!itemsExpression) return;

  const extractExpressionKey = (expression: string) => {
    const match = expression.match(/\{\{\s*([^}]+)\s*\}\}/);
    if (match) return match[1].trim();
    return expression.trim();
  };

  const availableMap = new Map<string, SelectableVariable>();
  groups.forEach((group) => {
    group.variables.forEach((variable) => {
      availableMap.set(variable.key, variable);
    });
  });

  const sourceKey = extractExpressionKey(itemsExpression);
  const sourceVar = availableMap.get(sourceKey);

  const itemVariableName = config?.itemVariable?.trim() || "item";
  const indexVariableName = config?.indexVariable?.trim() || "index";
  const iterationVariables: SelectableVariable[] = [];

  if (itemVariableName) {
    let itemType = "unknown";
    let itemTypeRef: string | undefined;

    if (sourceVar?.type === "array" || sourceVar?.type === "list") {
      const inferredRef = sourceVar.itemTypeRef || sourceVar.typeRef;
      if (inferredRef) {
        if (
          inferredRef === "string" ||
          inferredRef === "number" ||
          inferredRef === "boolean" ||
          inferredRef === "array"
        ) {
          itemType = inferredRef;
        } else {
          itemType = "object";
          itemTypeRef = inferredRef;
        }
      } else {
        itemType = "object";
      }
    }

    const baseVariable: SelectableVariable = {
      key: itemVariableName,
      name: itemVariableName,
      label: itemVariableName,
      type: itemType,
      typeRef: itemTypeRef,
      description: sourceVar?.label
        ? `来源: ${sourceVar.label}`
        : "迭代项变量",
      group: "迭代变量",
    };

    iterationVariables.push(baseVariable);
    iterationVariables.push(
      ...buildNestedStructureVariables(baseVariable, structureIndex)
    );
  }

  if (indexVariableName) {
    iterationVariables.push({
      key: indexVariableName,
      name: indexVariableName,
      label: indexVariableName,
      type: "number",
      description: "迭代索引",
      group: "迭代变量",
    });
  }

  if (iterationVariables.length > 0) {
    groups.push({
      name: "迭代变量",
      variables: iterationVariables,
    });
  }
};
