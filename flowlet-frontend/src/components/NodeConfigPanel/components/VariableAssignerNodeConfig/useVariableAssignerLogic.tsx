/**
 * VariableAssignerNodeConfig 业务逻辑 Hook
 */

import React, { useCallback, useMemo, useState } from "react";
import { Form, Tag, Space } from "antd";
import { TbVariablePlus, TbVariable } from "react-icons/tb";
import { AiOutlineDatabase } from "react-icons/ai";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import {
  AssignmentItem,
  VariableAssignerConfig,
  NodeType,
  FlowNodeData,
  SelectableVariable,
  OperationParams,
} from "@/types";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import { useConstantOptions } from "@/hooks/useConstantOptions";
import { computeResultType } from "./utils";

interface UseVariableAssignerLogicProps {
  nodeId: string;
}

export function useVariableAssignerLogic({ nodeId }: UseVariableAssignerLogicProps) {
  const form = Form.useFormInstance();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const updateNode = useFlowStore((state) => state.updateNode);
  const { currentProject } = useProjectStore();
  const flowId = useFlowStore((state) => state.flowId);
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const { options: constantOptions } = useConstantOptions(
    currentProject?.id,
    flowId ?? undefined
  );

  // 获取当前节点的配置
  const currentNode = nodes.find((n) => n.id === nodeId);
  const config = useMemo<VariableAssignerConfig>(() => {
    return (currentNode?.data?.config as VariableAssignerConfig) || { assignments: [] };
  }, [currentNode?.data?.config]);
  
  const assignments = useMemo(() => config.assignments || [], [config.assignments]);

  // 获取可复用流程列表
  const reusableFlows = useFlowStore((state) => state.reusableFlows);
  const dataStructures = useFlowStore((state) => state.dataStructures);
  const constants = useFlowStore((state) => state.constants);

  // 构建可用变量
  const variableGroups = useMemo(
    () => buildAvailableVariables(
      nodeId,
      nodes as FlowNode[],
      edges,
      reusableFlows,
      dataStructures,
      constants
    ),
    [nodeId, nodes, edges, reusableFlows, dataStructures, constants]
  );

  // 当前节点变量组
  const currentNodeVariableGroup = useMemo(() => {
    const variablesByName = new Map<string, SelectableVariable>();
    assignments
      .filter((assignment) => assignment.variableName?.trim())
      .forEach((assignment) => {
        const name = assignment.variableName!.trim();
        const resultType = computeResultType(
          assignment.mode,
          assignment.valueType,
          assignment.sourceType,
          assignment.operation
        );
        variablesByName.set(name, {
          key: `var.${name}`,
          name,
          label: name,
          type: resultType,
          description: "当前节点定义的变量",
          group: "当前节点变量",
        });
      });
    const variables = Array.from(variablesByName.values());

    if (variables.length === 0) return null;
    return { name: "当前节点变量", variables };
  }, [assignments]);

  const variableGroupsWithCurrent = useMemo(() => {
    if (!currentNodeVariableGroup) return variableGroups;
    return [...variableGroups, currentNodeVariableGroup];
  }, [currentNodeVariableGroup, variableGroups]);

  // 扁平化变量列表
  const allSourceVariables = useMemo(
    () => variableGroupsWithCurrent.flatMap((g) => g.variables),
    [variableGroupsWithCurrent]
  );

  // 收集所有已定义的变量名
  const variableDefinitions = useMemo(() => {
    const definitions = new Map<string, { firstAssignmentId: string; resultType: string }>();
    for (const node of nodes) {
      const nodeData = node.data as FlowNodeData;
      if (nodeData.nodeType === NodeType.VARIABLE_ASSIGNER) {
        const nodeConfig = nodeData.config as VariableAssignerConfig;
        if (nodeConfig?.assignments) {
          for (const a of nodeConfig.assignments) {
            const name = a.variableName?.trim();
            if (name && !definitions.has(name)) {
              definitions.set(name, {
                firstAssignmentId: a.id,
                resultType: computeResultType(
                  a.mode,
                  a.valueType,
                  a.sourceType,
                  a.operation
                ),
              });
            }
          }
        }
      }
    }
    return definitions;
  }, [nodes]);

  const allDefinedVariables = useMemo(() => {
    return Array.from(variableDefinitions.keys()).sort();
  }, [variableDefinitions]);

  // 判断变量是否为新建
  const isNewVariable = useCallback(
    (variableName: string, assignmentId: string) => {
      const name = variableName?.trim();
      if (!name) return false;
      const definition = variableDefinitions.get(name);
      return !definition || definition.firstAssignmentId === assignmentId;
    },
    [variableDefinitions]
  );

  // 构建变量名下拉选项
  const buildVariableNameOptions = useCallback(
    (searchText: string, currentAssignmentId: string) => {
      const options: { value: string; label: React.ReactNode }[] = [];
      const filteredExisting = allDefinedVariables.filter((name) =>
        name.toLowerCase().includes(searchText.toLowerCase())
      );

      const existingFromOthers = filteredExisting.filter((name) => {
        const def = variableDefinitions.get(name);
        return def && def.firstAssignmentId !== currentAssignmentId;
      });

      if (existingFromOthers.length > 0) {
        options.push({
          value: "__group_existing__",
          label: <span style={{ color: "#999", fontSize: 11, fontWeight: 500 }}>已有变量</span>,
        });
        for (const name of existingFromOthers) {
          options.push({
            value: name,
            label: (
              <Space size={4}>
                <TbVariable style={{ color: "#1890ff" }} />
                <span>{name}</span>
                <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>覆盖</Tag>
              </Space>
            ),
          });
        }
      }

      const trimmedSearch = searchText.trim();
      const searchDef = variableDefinitions.get(trimmedSearch);
      const isNewForCurrent = !searchDef || searchDef.firstAssignmentId === currentAssignmentId;

      if (trimmedSearch && isNewForCurrent) {
        if (options.length > 0) {
          options.push({
            value: "__group_new__",
            label: <span style={{ color: "#999", fontSize: 11, fontWeight: 500 }}>创建新变量</span>,
          });
        }
        options.push({
          value: trimmedSearch,
          label: (
            <Space size={4}>
              <TbVariablePlus style={{ color: "#52c41a" }} />
              <span>{trimmedSearch}</span>
              <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>新建</Tag>
            </Space>
          ),
        });
      }

      return options;
    },
    [allDefinedVariables, variableDefinitions]
  );

  // 构建数据来源下拉选项
  const buildSourceVariableOptions = useCallback(
    (styles: Record<string, string>) => {
      return variableGroupsWithCurrent.map((group) => ({
        label: (
          <div className={styles.variableGroupHeader}>
            {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
            <span>{group.name}</span>
          </div>
        ),
        options: group.variables.map((v) => ({
          value: `{{${v.key}}}`,
          label: (
            <div className={styles.variableSelectorOption}>
              <span className={styles.variableOptionIcon}>
                {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
              </span>
              <div className={styles.variableOptionContent}>
                <div className={styles.variableOptionPath}>{v.group}</div>
                <div className={styles.variableOptionName}>{v.name}</div>
              </div>
              <span className={styles.variableOptionType}>{v.type}</span>
            </div>
          ),
          data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}`, type: v.type },
        })),
      }));
    },
    [variableGroupsWithCurrent]
  );

  // 数字类型变量选项
  const buildNumericVariableOptions = useCallback(
    (styles: Record<string, string>) => {
      const numericGroups = variableGroupsWithCurrent
        .map((group) => ({
          ...group,
          variables: group.variables.filter((v) =>
            ["number", "integer", "float", "double"].includes(v.type)
          ),
        }))
        .filter((group) => group.variables.length > 0);

      return numericGroups.map((group) => ({
        label: (
          <div className={styles.variableGroupHeader}>
            {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
            <span>{group.name}</span>
          </div>
        ),
        options: group.variables.map((v) => ({
          value: `{{${v.key}}}`,
          label: (
            <div className={styles.variableSelectorOption}>
              <span className={styles.variableOptionIcon}>
                {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
              </span>
              <div className={styles.variableOptionContent}>
                <div className={styles.variableOptionPath}>{v.group}</div>
                <div className={styles.variableOptionName}>{v.name}</div>
              </div>
              <span className={styles.variableOptionType}>{v.type}</span>
            </div>
          ),
          data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}` },
        })),
      }));
    },
    [variableGroupsWithCurrent]
  );

  // 添加新赋值项
  const handleAddAssignment = useCallback(() => {
    const newAssignment: AssignmentItem = {
      id: `assign-${Date.now()}`,
      variableName: "",
      mode: "set",
      valueType: "string",
      value: "",
    };

    const newAssignments = [...assignments, newAssignment];
    form.setFieldValue("assignments", newAssignments);
    updateNode(nodeId, {
      config: { ...config, assignments: newAssignments },
    });
  }, [assignments, config, form, nodeId, updateNode]);

  // 删除赋值项
  const handleDeleteAssignment = useCallback(
    (id: string) => {
      const newAssignments = assignments.filter((a) => a.id !== id);
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  // 更新赋值项
  const handleUpdateAssignment = useCallback(
    (id: string, updates: Partial<AssignmentItem>) => {
      const newAssignments = assignments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  // 更新操作参数
  const handleUpdateOperationParams = useCallback(
    (id: string, paramUpdates: Partial<OperationParams>) => {
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) return;
      
      const newParams = { ...(assignment.operationParams || {}), ...paramUpdates };
      handleUpdateAssignment(id, { operationParams: newParams });
    },
    [assignments, handleUpdateAssignment]
  );

  // 拖拽排序
  const handleSortEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = assignments.findIndex((a) => a.id === active.id);
      const newIndex = assignments.findIndex((a) => a.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const newAssignments = arrayMove(assignments, oldIndex, newIndex);
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  // 搜索文本状态
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});
  
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return {
    assignments,
    dataStructures,
    allSourceVariables,
    enumOptions,
    constantOptions,
    searchTexts,
    setSearchTexts,
    sensors,
    isNewVariable,
    buildVariableNameOptions,
    buildSourceVariableOptions,
    buildNumericVariableOptions,
    handleAddAssignment,
    handleDeleteAssignment,
    handleUpdateAssignment,
    handleUpdateOperationParams,
    handleSortEnd,
  };
}
