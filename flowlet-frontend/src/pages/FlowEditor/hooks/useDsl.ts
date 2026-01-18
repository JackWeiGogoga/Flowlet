import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, NodeType } from "@/types";
import { getNodeTypeConfig } from "@/config/nodeTypes";
import { getNodeDefaultConfig } from "@/utils/nodeDefaults";
import { DSL_NODE_TYPES } from "../constants";
import { FlowDsl, FlowDslNode, GraphData, DslParseResult } from "../types";

interface UseDslOptions {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  flowName: string;
  currentFlow?: {
    description?: string;
    version?: number;
  } | null;
}

/**
 * DSL 解析、转换和验证的 Hook
 */
export function useDsl({ nodes, edges, flowName, currentFlow }: UseDslOptions) {
  const { t } = useTranslation("flow");

  /**
   * 解析 DSL 字符串，返回解析结果
   */
  const parseDsl = useCallback(
    (input: string): DslParseResult => {
      const errors: string[] = [];
      const notes: string[] = [];
      let parsed: unknown;

      try {
        parsed = JSON.parse(input);
      } catch {
        return {
          errors: [t("dslErrors.jsonParseFailed")],
          notes,
          dsl: null,
        };
      }

      if (!parsed || typeof parsed !== "object") {
        return {
          errors: [t("dslErrors.mustBeObject")],
          notes,
          dsl: null,
        };
      }

      const dsl = parsed as FlowDsl;
      if (!Array.isArray(dsl.nodes)) {
        errors.push(t("dslErrors.nodesRequired"));
        return { errors, notes, dsl: null };
      }

      const nodeIds = new Set<string>();
      const nodeTypes: string[] = [];

      dsl.nodes.forEach((node, index) => {
        if (!node || typeof node !== "object") {
          errors.push(t("dslErrors.nodeNotObject", { index }));
          return;
        }
        if (!node.type || typeof node.type !== "string") {
          errors.push(t("dslErrors.nodeNoType", { index }));
          return;
        }
        if (!DSL_NODE_TYPES.has(node.type as NodeType)) {
          errors.push(
            t("dslErrors.nodeTypeUnsupported", { index, type: node.type })
          );
        }
        if (!node.id) {
          errors.push(t("dslErrors.nodeNoId", { index }));
        } else if (node.id) {
          if (nodeIds.has(node.id)) {
            errors.push(t("dslErrors.nodeIdDuplicate", { id: node.id }));
          } else {
            nodeIds.add(node.id);
          }
        }
        if (node.position) {
          const { x, y } = node.position;
          if (typeof x !== "number" || typeof y !== "number") {
            errors.push(t("dslErrors.nodePositionInvalid", { index }));
          }
        }
        nodeTypes.push(node.type);
      });

      const startCount = nodeTypes.filter((tp) => tp === NodeType.START).length;
      const endCount = nodeTypes.filter((tp) => tp === NodeType.END).length;
      if (startCount === 0) {
        errors.push(t("dslErrors.noStartNode"));
      } else if (startCount > 1) {
        errors.push(t("dslErrors.multipleStartNodes"));
      }
      if (endCount === 0) {
        errors.push(t("dslErrors.noEndNode"));
      } else if (endCount > 1) {
        errors.push(t("dslErrors.multipleEndNodes"));
      }

      if (dsl.edges && !Array.isArray(dsl.edges)) {
        errors.push(t("dslErrors.edgesMustBeArray"));
      }

      if (Array.isArray(dsl.edges)) {
        dsl.edges.forEach((edge, index) => {
          if (!edge || typeof edge !== "object") {
            errors.push(t("dslErrors.edgeNotObject", { index }));
            return;
          }
          if (!edge.source || !edge.target) {
            errors.push(t("dslErrors.edgeMissingSourceTarget", { index }));
            return;
          }
          if (edge.source && edge.target) {
            const hasSource = nodeIds.has(edge.source);
            const hasTarget = nodeIds.has(edge.target);
            if (!hasSource || !hasTarget) {
              errors.push(
                t("dslErrors.edgeNodeNotFound", {
                  index,
                  source: edge.source,
                  target: edge.target,
                })
              );
            }
          }
        });
      }

      if (!dsl.edges || dsl.edges.length === 0) {
        notes.push(t("dslErrors.noEdgesNote"));
      }

      return { errors, notes, dsl };
    },
    [t]
  );

  /**
   * 从 DSL 构建图形节点和边
   */
  const buildNodesFromDsl = useCallback((dsl: FlowDsl): GraphData => {
    const nodes: Node<FlowNodeData>[] = dsl.nodes.map(
      (node: FlowDslNode, index: number) => {
        const nodeType = node.type as NodeType;
        const config = node.config ?? getNodeDefaultConfig(nodeType);
        const typeConfig = getNodeTypeConfig(nodeType);
        const label = node.label || typeConfig?.label || node.type;

        return {
          id: node.id ?? `${node.type}-${index + 1}`,
          type: "custom",
          position: node.position ?? { x: 0, y: 0 },
          data: {
            label,
            nodeType,
            description: node.description,
            config,
            alias: node.alias,
          },
        };
      }
    );

    const edges: Edge[] = (dsl.edges || []).map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index + 1}`,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      type: "addable",
      animated: edge.animated ?? false,
    }));

    return { nodes, edges };
  }, []);

  /**
   * 将当前图形转换为 DSL 字符串
   */
  const graphToDsl = useCallback(() => {
    const dsl: FlowDsl = {
      meta: {
        name: flowName,
        description: currentFlow?.description,
        exportedAt: new Date().toISOString(),
        version: currentFlow?.version,
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType,
        label: node.data.label,
        description: node.data.description,
        config: node.data.config,
        alias: node.data.alias,
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === "string" ? edge.label : undefined,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        type: edge.type,
        animated: edge.animated,
      })),
    };
    return JSON.stringify(dsl, null, 2);
  }, [currentFlow?.description, currentFlow?.version, edges, flowName, nodes]);

  /**
   * 导出的 DSL 文本（缓存）
   */
  const exportDslText = useMemo(() => graphToDsl(), [graphToDsl]);

  /**
   * 确保 ID 唯一性
   */
  const ensureUniqueId = useCallback(
    (base: string, existing: Set<string>) => {
      if (!existing.has(base)) return base;
      let counter = 1;
      let next = `${base}-${counter}`;
      while (existing.has(next)) {
        counter += 1;
        next = `${base}-${counter}`;
      }
      return next;
    },
    []
  );

  /**
   * 合并图形数据（用于追加模式）
   */
  const mergeGraphData = useCallback(
    (incoming: GraphData): GraphData => {
      const existingNodeIds = new Set(nodes.map((node) => node.id));
      const existingEdgeIds = new Set(edges.map((edge) => edge.id));
      const idMap = new Map<string, string>();
      const maxX = nodes.reduce(
        (acc, node) => Math.max(acc, node.position.x),
        0
      );
      const baseX = maxX + 260;
      const baseY = 120;
      const gapY = 120;

      const mergedNodes = incoming.nodes.map((node, index) => {
        const originalId = node.id;
        const resolvedId = ensureUniqueId(originalId, existingNodeIds);
        existingNodeIds.add(resolvedId);
        idMap.set(originalId, resolvedId);

        const position =
          node.position.x === 0 && node.position.y === 0
            ? { x: baseX, y: baseY + index * gapY }
            : node.position;

        return {
          ...node,
          id: resolvedId,
          position,
        };
      });

      const mergedEdges = incoming.edges.map((edge, index) => {
        const mappedSource = idMap.get(edge.source) ?? edge.source;
        const mappedTarget = idMap.get(edge.target) ?? edge.target;
        const edgeId = ensureUniqueId(
          edge.id || `edge-${mappedSource}-${mappedTarget}-${index + 1}`,
          existingEdgeIds
        );
        existingEdgeIds.add(edgeId);

        return {
          ...edge,
          id: edgeId,
          source: mappedSource,
          target: mappedTarget,
        };
      });

      return {
        nodes: [...nodes, ...mergedNodes],
        edges: [...edges, ...mergedEdges],
      };
    },
    [edges, ensureUniqueId, nodes]
  );

  return {
    parseDsl,
    buildNodesFromDsl,
    graphToDsl,
    exportDslText,
    ensureUniqueId,
    mergeGraphData,
  };
}
