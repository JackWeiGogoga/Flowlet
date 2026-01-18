import { useState, useMemo, useCallback, useRef } from "react";
import { Form } from "antd";
import { useFlowStore } from "@/store/flowStore";
import type { FieldMapping, UpstreamNodeData, FlowNodeDataWithDebug } from "./types";
import { normalizeRegexMode, createEmptyMapping } from "./utils";

/**
 * 从节点配置中提取并规范化映射数据
 */
function extractMappingsFromNode(
  nodeConfig: Record<string, unknown> | undefined
): FieldMapping[] {
  const configMappings = nodeConfig?.mappings;
  if (!configMappings || !Array.isArray(configMappings) || configMappings.length === 0) {
    return [];
  }

  return configMappings.map(
    (m: Partial<FieldMapping>): FieldMapping => ({
      id: m.id || `${Date.now()}-${Math.random()}`,
      source: m.source,
      target: m.target || "",
      expression: m.expression,
      regexMode: normalizeRegexMode(m.regexMode),
      regexPattern: m.regexPattern,
      regexFlags: m.regexFlags,
      regexReplace: m.regexReplace,
      regexGroup: m.regexGroup,
    })
  );
}

/**
 * 管理字段映射状态的 Hook
 */
export function useMappings() {
  const form = Form.useFormInstance();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const selectedNode = useFlowStore((state) =>
    state.nodes.find((n) => n.selected)
  );

  // 跟踪上一个选中的节点 ID，用于检测节点切换
  const prevNodeIdRef = useRef<string | undefined>(undefined);
  const selectedNodeId = selectedNode?.id;

  // 使用本地状态管理 mappings，解决 Form.useWatch 延迟更新的问题
  // 使用惰性初始化从当前选中节点获取初始值
  const [localMappings, setLocalMappings] = useState<FieldMapping[]>(() => {
    if (!selectedNode) return [];
    return extractMappingsFromNode(selectedNode.data.config);
  });

  // 检测节点切换，在渲染期间同步重置状态（避免在 effect 中调用 setState）
  if (selectedNodeId !== prevNodeIdRef.current) {
    prevNodeIdRef.current = selectedNodeId;
    const newMappings = selectedNode
      ? extractMappingsFromNode(selectedNode.data.config)
      : [];
    // 直接在渲染期间更新状态（React 支持这种模式）
    // 参考: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    setLocalMappings(newMappings);
    // 同步更新表单值
    if (newMappings.length > 0) {
      form.setFieldValue("mappings", newMappings);
    }
  }

  // 监听表单变化（作为备用）
  const formMappings = Form.useWatch("mappings", { form, preserve: true }) as
    | FieldMapping[]
    | undefined;

  // 使用本地状态或表单状态
  const mappings = localMappings.length > 0 ? localMappings : formMappings;

  /**
   * 获取上游节点及其调试输出数据
   */
  const upstreamNodesData = useMemo((): UpstreamNodeData[] => {
    if (!selectedNode) return [];

    // 找到连接到当前节点的边
    const incomingEdges = edges.filter((e) => e.target === selectedNode.id);
    const upstreamNodeIds = incomingEdges.map((e) => e.source);

    // 获取上游节点
    return nodes
      .filter((n) => upstreamNodeIds.includes(n.id))
      .map((node) => {
        const nodeData = node.data as FlowNodeDataWithDebug;
        return {
          id: node.id,
          label: nodeData.label || node.id,
          type: nodeData.nodeType,
          // 从节点的调试结果中获取示例数据（如果有）
          sampleData: nodeData.debugOutput || null,
        };
      });
  }, [selectedNode, nodes, edges]);

  /**
   * 检测重复的目标字段名
   */
  const duplicateTargets = useMemo(() => {
    if (!mappings || mappings.length === 0) return new Set<string>();

    const targetCounts: Record<string, number> = {};
    mappings.forEach((m) => {
      const target = m.target?.trim();
      if (target) {
        targetCounts[target] = (targetCounts[target] || 0) + 1;
      }
    });

    // 返回出现次数大于1的字段名
    return new Set(
      Object.entries(targetCounts)
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [mappings]);

  /**
   * 同步 mappings 到节点配置
   */
  const syncMappingsToNode = useCallback(
    (newMappings: FieldMapping[]) => {
      if (!selectedNode) return;

      const { updateNode } = useFlowStore.getState();
      updateNode(selectedNode.id, {
        config: {
          ...selectedNode.data.config,
          mappings: newMappings,
        },
      });
    },
    [selectedNode]
  );

  /**
   * 初始化映射列表
   */
  const initMappings = useCallback(() => {
    if (!mappings || mappings.length === 0) {
      const newMappings: FieldMapping[] = [createEmptyMapping()];
      form.setFieldValue("mappings", newMappings);
      setLocalMappings(newMappings);
      syncMappingsToNode(newMappings);
    }
  }, [mappings, form, syncMappingsToNode]);

  /**
   * 添加映射项
   */
  const addMapping = useCallback(() => {
    const current = mappings || [];
    const newMappings: FieldMapping[] = [...current, createEmptyMapping()];
    form.setFieldValue("mappings", newMappings);
    setLocalMappings(newMappings);
    syncMappingsToNode(newMappings);
  }, [mappings, form, syncMappingsToNode]);

  /**
   * 删除映射项
   */
  const removeMapping = useCallback(
    (id: string) => {
      const current = mappings || [];
      const newMappings = current.filter((m) => m.id !== id);
      form.setFieldValue("mappings", newMappings);
      setLocalMappings(newMappings);
      syncMappingsToNode(newMappings);
    },
    [mappings, form, syncMappingsToNode]
  );

  /**
   * 更新映射项
   */
  const updateMapping = useCallback(
    (id: string, field: keyof FieldMapping, value: string) => {
      const current = mappings || [];
      const newMappings = current.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      );
      form.setFieldValue("mappings", newMappings);
      setLocalMappings(newMappings);
      syncMappingsToNode(newMappings);
    },
    [mappings, form, syncMappingsToNode]
  );

  /**
   * 批量添加映射
   */
  const batchAddMappings = useCallback(
    (selectedBatchFields: string[]) => {
      const current = mappings || [];
      // 过滤掉空的映射项
      const validMappings = current.filter(
        (m) => (m.source && m.source.trim()) || (m.target && m.target.trim())
      );

      // 收集已存在的 target 名称
      const existingTargets = new Set(
        validMappings.map((m) => m.target).filter(Boolean)
      );

      // 用于跟踪每个基础名称的使用计数
      const targetNameCounts: Record<string, number> = {};

      // 初始化计数器
      existingTargets.forEach((target) => {
        const match = target.match(/^(.+)_(\d+)$/);
        if (match) {
          const baseName = match[1];
          const num = parseInt(match[2], 10);
          targetNameCounts[baseName] = Math.max(
            targetNameCounts[baseName] || 0,
            num
          );
        }
      });

      /**
       * 生成唯一的 target 名称
       */
      const generateUniqueTarget = (baseName: string): string => {
        if (!existingTargets.has(baseName) && !targetNameCounts[baseName]) {
          existingTargets.add(baseName);
          return baseName;
        }

        let count = (targetNameCounts[baseName] || 0) + 1;
        let uniqueName = `${baseName}_${count}`;
        while (existingTargets.has(uniqueName)) {
          count++;
          uniqueName = `${baseName}_${count}`;
        }
        targetNameCounts[baseName] = count;
        existingTargets.add(uniqueName);
        return uniqueName;
      };

      const newMappings: FieldMapping[] = [
        ...validMappings,
        ...selectedBatchFields.map((fieldKey) => {
          const parts = fieldKey.split(".");
          const baseName = parts[parts.length - 1].replace(/\[\d+\]/g, "");
          const targetName = generateUniqueTarget(baseName);

          return {
            id: `${Date.now()}-${Math.random()}`,
            source: fieldKey,
            target: targetName,
          };
        }),
      ];
      form.setFieldValue("mappings", newMappings);
      setLocalMappings(newMappings);
      syncMappingsToNode(newMappings);
    },
    [mappings, form, syncMappingsToNode]
  );

  return {
    mappings,
    upstreamNodesData,
    duplicateTargets,
    hasDuplicateTargets: duplicateTargets.size > 0,
    initMappings,
    addMapping,
    removeMapping,
    updateMapping,
    batchAddMappings,
  };
}
