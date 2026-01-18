import { create } from "zustand";
import {
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { type FlowNodeData, type FlowDefinition, NodeType } from "@/types";
import type { DataStructureResponse } from "@/services/dataStructureService";
import type { ConstantDefinitionResponse } from "@/services/constantService";

// 定义带有 FlowNodeData 的节点类型
export type FlowNode = Node<FlowNodeData>;

/**
 * 生成节点别名
 * 规则：节点类型_序号，如 kafka_1, api_2
 * @param nodeType 节点类型
 * @param existingNodes 现有节点列表
 * @returns 新的别名
 */
export const generateNodeAlias = (
  nodeType: NodeType,
  existingNodes: FlowNode[]
): string => {
  // 统计同类型节点的数量
  const sameTypeNodes = existingNodes.filter(
    (node) => node.data.nodeType === nodeType
  );

  // 收集已使用的序号
  const usedNumbers = new Set<number>();
  sameTypeNodes.forEach((node) => {
    const alias = node.data.alias;
    if (alias) {
      const match = alias.match(new RegExp(`^${nodeType}_(\\d+)$`));
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }
  });

  // 找到最小的未使用序号
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${nodeType}_${nextNumber}`;
};

// 布局常量（从左到右布局）
const LAYOUT_CONFIG = {
  NODE_GAP_X: 80, // 节点之间的水平间距（缩短使布局更紧凑）
  NODE_GAP_Y: 60, // 同层节点之间的垂直间距
  START_X: 80, // 起始 X 坐标
  START_Y: 150, // 起始 Y 坐标
  DEFAULT_NODE_WIDTH: 180, // 默认节点宽度
};

// 历史记录快照类型
interface HistorySnapshot {
  nodes: FlowNode[];
  edges: Edge[];
}

// 历史记录配置
const HISTORY_CONFIG = {
  MAX_HISTORY_SIZE: 50, // 最大历史记录数量
  DEBOUNCE_DELAY: 300, // 防抖延迟（毫秒）
};

// 防抖定时器
let saveHistoryTimer: ReturnType<typeof setTimeout> | null = null;

interface FlowState {
  // 当前编辑的流程ID
  flowId: string | null;

  // 当前编辑的流程
  currentFlow: FlowDefinition | null;

  // 流程图节点和边
  nodes: FlowNode[];
  edges: Edge[];

  // 选中的节点
  selectedNode: FlowNode | null;

  // 是否有未保存的更改
  hasChanges: boolean;

  // 节点高度缓存（用于检测高度变化）
  nodeHeights: Record<string, number>;

  // 历史记录相关
  history: HistorySnapshot[]; // 历史记录栈
  historyIndex: number; // 当前历史记录索引
  isUndoRedoAction: boolean; // 是否正在执行 undo/redo 操作

  // 可复用的流程列表（用于子流程选择和输出变量显示）
  reusableFlows: FlowDefinition[];

  // 可用数据结构列表（用于输出结构展开）
  dataStructures: DataStructureResponse[];

  // 可用常量列表（用于变量选择）
  constants: ConstantDefinitionResponse[];

  // Actions
  setCurrentFlow: (flow: FlowDefinition | null) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (node: FlowNode | null) => void;
  setHasChanges: (hasChanges: boolean) => void;
  updateNodeHeight: (nodeId: string, height: number) => void;
  autoLayout: () => void;
  reset: () => void;

  // 历史记录 Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  saveToHistoryNow: () => void;
  initializeHistory: () => void; // 重置历史记录（用于加载流程后）

  // 可复用流程 Actions
  setReusableFlows: (flows: FlowDefinition[]) => void;

  // 数据结构 Actions
  setDataStructures: (structures: DataStructureResponse[]) => void;

  // 常量 Actions
  setConstants: (constants: ConstantDefinitionResponse[]) => void;
}

// 生成默认的开始和结束节点（从左到右布局）
const createDefaultNodes = (): FlowNode[] => [
  {
    id: "start-1",
    type: "custom",
    position: { x: LAYOUT_CONFIG.START_X, y: LAYOUT_CONFIG.START_Y },
    data: {
      nodeType: NodeType.START,
      label: "开始",
      config: {},
    },
  },
  {
    id: "end-1",
    type: "custom",
    position: {
      x:
        LAYOUT_CONFIG.START_X +
        LAYOUT_CONFIG.DEFAULT_NODE_WIDTH +
        LAYOUT_CONFIG.NODE_GAP_X,
      y: LAYOUT_CONFIG.START_Y,
    },
    data: {
      nodeType: NodeType.END,
      label: "结束",
      config: {},
    },
  },
];

// 生成默认的连线
const createDefaultEdges = (): Edge[] => [
  {
    id: "edge-start-end",
    source: "start-1",
    target: "end-1",
    type: "addable",
    animated: false,
  },
];

const createInitialState = () => {
  const nodes = createDefaultNodes();
  const edges = createDefaultEdges();
  return {
    flowId: null as string | null,
    currentFlow: null,
    nodes,
    edges,
    selectedNode: null,
    hasChanges: false,
    nodeHeights: {} as Record<string, number>,
    // 初始化历史记录
    history: [{ nodes: structuredClone(nodes), edges: structuredClone(edges) }],
    historyIndex: 0,
    isUndoRedoAction: false,
    // 可复用流程列表
    reusableFlows: [] as FlowDefinition[],

    // 数据结构列表
    dataStructures: [] as DataStructureResponse[],

    // 常量列表
    constants: [] as ConstantDefinitionResponse[],
  };
};

export const useFlowStore = create<FlowState>((set, get) => ({
  ...createInitialState(),

  setCurrentFlow: (flow) =>
    set({ currentFlow: flow, flowId: flow?.id || null }),

  setNodes: (nodes) => {
    const { isUndoRedoAction } = get();
    set({ nodes, hasChanges: true });
    // 如果不是 undo/redo 操作，保存到历史记录
    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  setEdges: (edges) => {
    const { isUndoRedoAction } = get();
    set({ edges, hasChanges: true });
    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  onNodesChange: (changes) => {
    const { isUndoRedoAction, nodes: currentNodes } = get();
    const newNodes = applyNodeChanges(
      changes,
      currentNodes as Node[]
    ) as FlowNode[];

    // 检查是否有实质性变化（排除选中状态变化）
    const hasSubstantialChange = changes.some(
      (change) => change.type !== "select" && change.type !== "dimensions"
    );

    set({
      nodes: newNodes,
      hasChanges: hasSubstantialChange ? true : get().hasChanges,
    });

    // 只有实质性变化才保存到历史记录
    if (hasSubstantialChange && !isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  onEdgesChange: (changes) => {
    const { isUndoRedoAction } = get();
    const hasSubstantialChange = changes.some(
      (change) => change.type !== "select"
    );

    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasChanges: hasSubstantialChange ? true : get().hasChanges,
    });

    if (hasSubstantialChange && !isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  onConnect: (connection) => {
    const { isUndoRedoAction } = get();
    set({
      edges: addEdge(
        {
          ...connection,
          type: "addable",
          animated: false,
        },
        get().edges
      ),
      hasChanges: true,
    });
    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  addNode: (node) => {
    const { isUndoRedoAction } = get();
    set({
      nodes: [...get().nodes, node],
      hasChanges: true,
    });
    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  updateNode: (nodeId, data) => {
    const { isUndoRedoAction } = get();
    const updatedNodes = get().nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    const currentSelected = get().selectedNode;

    set({
      nodes: updatedNodes,
      // 同步更新 selectedNode
      selectedNode:
        currentSelected?.id === nodeId
          ? updatedNodes.find((n) => n.id === nodeId) || null
          : currentSelected,
      hasChanges: true,
    });

    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  deleteNode: (nodeId) => {
    const { isUndoRedoAction } = get();
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode:
        get().selectedNode?.id === nodeId ? null : get().selectedNode,
      hasChanges: true,
    });
    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  setSelectedNode: (node) => set({ selectedNode: node }),

  setHasChanges: (hasChanges) => set({ hasChanges }),

  // 更新节点高度缓存（用于自动布局时计算位置）
  // 注意：水平布局中，节点高度变化不需要自动调整其他节点位置
  // 节点保持顶部对齐，高度向下增长
  updateNodeHeight: (nodeId, height) => {
    const { nodeHeights } = get();
    const oldHeight = nodeHeights[nodeId] || 0;

    // 如果高度没有变化，不处理
    if (Math.abs(oldHeight - height) < 1) return;

    // 只更新高度缓存，不调整其他节点位置
    // 这样可以保持节点顶部对齐，高度向下扩展
    set({
      nodeHeights: { ...nodeHeights, [nodeId]: height },
    });
  },

  // 自动布局：从左到右重新排列所有节点，顶部对齐
  autoLayout: () => {
    const { nodes, edges, nodeHeights, isUndoRedoAction } = get();
    const { NODE_GAP_X, NODE_GAP_Y, START_X, START_Y, DEFAULT_NODE_WIDTH } =
      LAYOUT_CONFIG;
    const DEFAULT_HEIGHT = 100;

    // 排除 note 节点，不参与布局计算
    const layoutNodes = nodes.filter((node) => node.type !== "note");
    const noteNodes = nodes.filter((node) => node.type === "note");

    // 构建节点的层级关系（从左到右，level 0 在最左边）
    const getNodeLevel = (
      nodeId: string,
      visited = new Set<string>()
    ): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const incomingEdges = edges.filter((e) => e.target === nodeId);
      if (incomingEdges.length === 0) return 0;

      return Math.max(
        ...incomingEdges.map((e) => getNodeLevel(e.source, visited) + 1)
      );
    };

    // 按层级分组（仅处理非 note 节点）
    const nodeLevels: Record<number, FlowNode[]> = {};
    layoutNodes.forEach((node) => {
      const level = getNodeLevel(node.id);
      if (!nodeLevels[level]) nodeLevels[level] = [];
      nodeLevels[level].push(node);
    });

    // 从左到右布局，顶部对齐
    let currentX = START_X;
    const updatedNodes: FlowNode[] = [];

    const sortedLevels = Object.keys(nodeLevels)
      .map(Number)
      .sort((a, b) => a - b);

    sortedLevels.forEach((level) => {
      const levelNodes = nodeLevels[level];

      // 按当前 Y 坐标排序，保持用户手动调整的上下顺序
      levelNodes.sort((a, b) => a.position.y - b.position.y);

      // 顶部对齐：所有节点的 Y 坐标从 START_Y 开始
      let currentY = START_Y;

      levelNodes.forEach((node) => {
        const nodeHeight = nodeHeights[node.id] || DEFAULT_HEIGHT;

        updatedNodes.push({
          ...node,
          position: {
            x: currentX,
            y: currentY,
          },
        });

        // 同一层的多个节点垂直排列
        currentY += nodeHeight + NODE_GAP_Y;
      });

      // 移动到下一层的 X 坐标
      currentX += DEFAULT_NODE_WIDTH + NODE_GAP_X;
    });

    // 将 note 节点保持原位置加回结果中
    set({
      nodes: [...updatedNodes, ...noteNodes],
      hasChanges: true,
    });

    if (!isUndoRedoAction) {
      get().saveToHistory();
    }
  },

  reset: () => set(createInitialState()),

  // ========== 历史记录相关方法 ==========

  // 保存当前状态到历史记录（带防抖，避免频繁保存）
  saveToHistory: () => {
    // 清除之前的定时器
    if (saveHistoryTimer) {
      clearTimeout(saveHistoryTimer);
    }

    // 使用防抖，延迟保存
    saveHistoryTimer = setTimeout(() => {
      get().saveToHistoryNow();
    }, HISTORY_CONFIG.DEBOUNCE_DELAY);
  },

  // 立即保存当前状态到历史记录
  saveToHistoryNow: () => {
    const { nodes, edges, history, historyIndex } = get();

    // 创建当前状态的深拷贝
    const snapshot: HistorySnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };

    // 检查是否与上一个快照相同（避免重复保存）
    const lastSnapshot = history[historyIndex];
    if (lastSnapshot) {
      const nodesEqual =
        JSON.stringify(snapshot.nodes) === JSON.stringify(lastSnapshot.nodes);
      const edgesEqual =
        JSON.stringify(snapshot.edges) === JSON.stringify(lastSnapshot.edges);
      if (nodesEqual && edgesEqual) {
        return; // 状态没有变化，不保存
      }
    }

    // 如果当前不在历史记录末尾，删除后面的记录
    const newHistory = history.slice(0, historyIndex + 1);

    // 添加新的快照
    newHistory.push(snapshot);

    // 限制历史记录大小
    if (newHistory.length > HISTORY_CONFIG.MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // 撤销
  undo: () => {
    if (saveHistoryTimer) {
      clearTimeout(saveHistoryTimer);
      saveHistoryTimer = null;
      get().saveToHistoryNow();
    }

    const { history, historyIndex } = get();

    if (historyIndex <= 0) return; // 没有更早的历史记录

    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];

    set({
      isUndoRedoAction: true,
      nodes: structuredClone(snapshot.nodes),
      edges: structuredClone(snapshot.edges),
      historyIndex: newIndex,
      // 如果回到初始状态（index === 0），说明没有修改
      hasChanges: newIndex > 0,
      selectedNode: null, // 清除选中状态
    });

    // 重置 isUndoRedoAction 标志
    set({ isUndoRedoAction: false });
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex >= history.length - 1) return; // 没有更新的历史记录

    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];

    set({
      isUndoRedoAction: true,
      nodes: structuredClone(snapshot.nodes),
      edges: structuredClone(snapshot.edges),
      historyIndex: newIndex,
      // 只要不是初始状态就有修改
      hasChanges: newIndex > 0,
      selectedNode: null, // 清除选中状态
    });

    // 重置 isUndoRedoAction 标志
    set({ isUndoRedoAction: false });
  },

  // 检查是否可以撤销
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  // 检查是否可以重做
  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // 初始化/重置历史记录（加载流程后调用）
  // 将当前状态作为历史记录的起点，清除之前的所有历史
  initializeHistory: () => {
    // 清除之前的防抖定时器，避免加载后产生多余的历史记录
    if (saveHistoryTimer) {
      clearTimeout(saveHistoryTimer);
      saveHistoryTimer = null;
    }

    const { nodes, edges } = get();

    const snapshot: HistorySnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };

    set({
      history: [snapshot],
      historyIndex: 0,
    });
  },

  // 设置可复用流程列表
  setReusableFlows: (flows) => set({ reusableFlows: flows }),

  // 设置数据结构列表
  setDataStructures: (structures) => set({ dataStructures: structures }),

  setConstants: (constants) => set({ constants }),
}));
