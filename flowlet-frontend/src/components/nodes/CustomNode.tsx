import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import {
  useFlowStore,
  generateNodeAlias,
  type FlowNode,
} from "@/store/flowStore";
import { useModelHubStore } from "@/store/modelHubStore";
import {
  AiOutlinePlayCircle,
  AiOutlineStop,
  AiOutlineApi,
  AiOutlineBranches,
  AiOutlineSwap,
  AiOutlineFontSize,
  AiOutlineAlignLeft,
  AiOutlineUnorderedList,
  AiOutlineNumber,
  AiOutlinePlus,
  AiOutlineCode,
  AiOutlineDatabase,
  AiOutlineReload,
  AiOutlineTags,
  AiOutlineMessage,
} from "react-icons/ai";
import { TbVariablePlus, TbJson, TbFingerprint } from "react-icons/tb";
import {
  NodeType,
  FlowNodeData,
  InputVariable,
  VariableType,
  StartNodeConfig,
  OutputVariableConfig,
  EndNodeConfig,
  LlmNodeConfig,
} from "@/types";
import { getNodeTypes } from "@/config/nodeTypes";
import { SiApachekafka } from "react-icons/si";
import { LuBrain } from "react-icons/lu";
import IconMap from "@/components/LLMIcons";
import {
  STANDARD_PROVIDER_ICON_KEYS,
  STANDARD_PROVIDER_LABELS,
  STANDARD_PROVIDER_COLORS,
} from "@/config/llmProviders";
import { useStyles } from "./CustomNode.style";
import { NodeTypeMenu } from "@/components/FlowDesigner/NodeTypeMenu";

// 条件分支类型（与 ConditionNodeConfig 保持一致）
interface ConditionBranch {
  id: string;
  type: "if" | "elif";
  logicOperator: "and" | "or";
  conditions: Array<{
    id: string;
    variableKey: string;
    operator: string;
    value: string;
  }>;
  alias?: string;
}

interface ConditionConfigData {
  branches: ConditionBranch[];
}

interface CustomNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

// 节点图标映射
const nodeIcons: Record<NodeType, React.ReactNode> = {
  [NodeType.START]: <AiOutlinePlayCircle />,
  [NodeType.END]: <AiOutlineStop />,
  [NodeType.API]: <AiOutlineApi />,
  [NodeType.KAFKA]: <SiApachekafka />,
  [NodeType.CODE]: <AiOutlineCode />,
  [NodeType.CONDITION]: <AiOutlineBranches />,
  [NodeType.TRANSFORM]: <AiOutlineSwap />,
  [NodeType.SUBFLOW]: <AiOutlineBranches />,
  [NodeType.FOR_EACH]: <AiOutlineReload />,
  [NodeType.LLM]: <LuBrain />,
  [NodeType.VECTOR_STORE]: <AiOutlineDatabase />,
  [NodeType.VARIABLE_ASSIGNER]: <TbVariablePlus />,
  [NodeType.JSON_PARSER]: <TbJson />,
  [NodeType.SIMHASH]: <TbFingerprint />,
  [NodeType.KEYWORD_MATCH]: <AiOutlineTags />,
  [NodeType.NOTE]: <AiOutlineMessage />,
};

// 节点颜色映射
const nodeColors: Record<NodeType, string> = {
  [NodeType.START]: "#52c41a",
  [NodeType.END]: "#ff4d4f",
  [NodeType.API]: "#1890ff",
  [NodeType.KAFKA]: "#722ed1",
  [NodeType.CODE]: "#6366f1",
  [NodeType.CONDITION]: "#faad14",
  [NodeType.TRANSFORM]: "#13c2c2",
  [NodeType.SUBFLOW]: "#eb2f96",
  [NodeType.FOR_EACH]: "#eb2f96",
  [NodeType.LLM]: "#3b82f6",
  [NodeType.VECTOR_STORE]: "#10b981",
  [NodeType.VARIABLE_ASSIGNER]: "#06b6d4",
  [NodeType.JSON_PARSER]: "#f59e0b",
  [NodeType.SIMHASH]: "#14b8a6",
  [NodeType.KEYWORD_MATCH]: "#f97316",
  [NodeType.NOTE]: "#8b5cf6",
};

// 变量类型图标映射
const variableTypeIcons: Record<VariableType, React.ReactNode> = {
  [VariableType.TEXT]: <AiOutlineFontSize />,
  [VariableType.PARAGRAPH]: <AiOutlineAlignLeft />,
  [VariableType.SELECT]: <AiOutlineUnorderedList />,
  [VariableType.NUMBER]: <AiOutlineNumber />,
  [VariableType.STRUCTURE]: <AiOutlineDatabase />,
};

// 布局常量（与 flowStore 保持一致）
const LAYOUT_CONFIG = {
  NODE_GAP_X: 80,
  NODE_GAP_Y: 60,
  DEFAULT_NODE_WIDTH: 180,
  DEFAULT_NODE_HEIGHT: 80,
};

/**
 * 自定义节点组件
 */
const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const { styles, cx } = useStyles();
  const { label, nodeType, description, config } = data;
  const icon = nodeIcons[nodeType];
  const nodeRef = useRef<HTMLDivElement>(null);
  const nodeId = useNodeId();
  const updateNodeHeight = useFlowStore((state) => state.updateNodeHeight);
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  const { standardConfigs, customProviders, fetchProviders } =
    useModelHubStore();

  // 菜单状态
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [activeHandleId, setActiveHandleId] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 开始节点没有输入 handle
  const showInputHandle = nodeType !== NodeType.START;
  // 结束节点没有输出 handle
  const showOutputHandle = nodeType !== NodeType.END;
  // 条件节点有两个输出 handle
  const isConditionNode = nodeType === NodeType.CONDITION;
  // 是否是开始节点
  const isStartNode = nodeType === NodeType.START;

  // 是否是结束节点
  const isEndNode = nodeType === NodeType.END;

  // 获取开始节点的变量列表
  const getVariables = (): InputVariable[] => {
    if (!isStartNode || !config) return [];
    return (config as StartNodeConfig).variables || [];
  };

  // 获取结束节点的输出变量列表
  const getOutputVariables = (): OutputVariableConfig[] => {
    if (!isEndNode || !config) return [];
    return (config as EndNodeConfig).outputVariables || [];
  };

  // 获取条件节点的分支配置
  const getConditionBranches = (): ConditionBranch[] => {
    if (!isConditionNode || !config) return [];
    const conditionConfig = (
      config as { conditionConfig?: ConditionConfigData }
    ).conditionConfig;
    if (conditionConfig && conditionConfig.branches) {
      return conditionConfig.branches;
    }
    // 默认返回一个 IF 分支
    return [
      { id: "default-if", type: "if", logicOperator: "and", conditions: [] },
    ];
  };

  const variables = getVariables();
  const outputVariables = getOutputVariables();
  const conditionBranches = getConditionBranches();
  const llmConfig =
    nodeType === NodeType.LLM
      ? (config as LlmNodeConfig | undefined)
      : undefined;
  const customProviderName =
    llmConfig?.providerType === "CUSTOM"
      ? customProviders.find((provider) => provider.id === llmConfig.providerId)
          ?.name || llmConfig?.providerId
      : undefined;
  const standardLabel =
    llmConfig?.providerType === "STANDARD" && llmConfig?.providerKey
      ? STANDARD_PROVIDER_LABELS[
          llmConfig.providerKey as keyof typeof STANDARD_PROVIDER_LABELS
        ] || llmConfig.providerKey
      : undefined;
  const standardIconKey =
    llmConfig?.providerType === "STANDARD" && llmConfig?.providerKey
      ? STANDARD_PROVIDER_ICON_KEYS[
          llmConfig.providerKey as keyof typeof STANDARD_PROVIDER_ICON_KEYS
        ]
      : undefined;
  const StandardIcon =
    standardIconKey && IconMap[standardIconKey]
      ? IconMap[standardIconKey]
      : undefined;
  const llmProvider =
    llmConfig?.providerType === "CUSTOM"
      ? customProviderName
      : standardLabel || llmConfig?.providerKey;
  const llmModel = llmConfig?.model;
  const standardColor =
    llmConfig?.providerType === "STANDARD" && llmConfig?.providerKey
      ? STANDARD_PROVIDER_COLORS[
          llmConfig.providerKey as keyof typeof STANDARD_PROVIDER_COLORS
        ]
      : undefined;
  const headerColor =
    nodeType === NodeType.LLM
      ? standardColor || nodeColors[nodeType]
      : nodeColors[nodeType];
  const llmHeaderLabel = llmProvider || "LLM";
  const llmHeaderIcon = StandardIcon ? (
    <StandardIcon className={styles.nodeIcon} />
  ) : (
    nodeIcons[NodeType.LLM]
  );

  // 监听节点高度变化，自动调整下游节点位置
  useEffect(() => {
    if (!nodeRef.current || !nodeId) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        updateNodeHeight(nodeId, height);
      }
    });

    resizeObserver.observe(nodeRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [nodeId, updateNodeHeight]);

  useEffect(() => {
    if (nodeType !== NodeType.LLM) {
      return;
    }
    if (Object.keys(standardConfigs).length > 0 || customProviders.length > 0) {
      return;
    }
    fetchProviders();
  }, [nodeType, standardConfigs, customProviders, fetchProviders]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setMenuOpen(false);
      setActiveHandleId(null);
      setHoveredHandle(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [menuOpen]);

  // 处理 Handle 点击
  const handleHandleClick = useCallback(
    (e: React.MouseEvent, handleId?: string) => {
      e.stopPropagation();
      e.preventDefault();

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        x: rect.right + 8,
        y: rect.top + rect.height / 2,
      });
      setActiveHandleId(handleId || null);
      setMenuOpen(true);
    },
    []
  );

  // 检查位置是否与现有节点冲突
  const findNonOverlappingY = useCallback(
    (
      baseX: number,
      baseY: number,
      nodes: { id: string; position: { x: number; y: number } }[]
    ) => {
      const nodeHeight = LAYOUT_CONFIG.DEFAULT_NODE_HEIGHT;
      const nodeWidth = LAYOUT_CONFIG.DEFAULT_NODE_WIDTH;
      const gapY = LAYOUT_CONFIG.NODE_GAP_Y;

      // 找出在同一 X 范围内的所有节点
      const nodesInSameColumn = nodes.filter(
        (n) => Math.abs(n.position.x - baseX) < nodeWidth
      );

      if (nodesInSameColumn.length === 0) {
        return baseY;
      }

      // 按 Y 坐标排序
      nodesInSameColumn.sort((a, b) => a.position.y - b.position.y);

      // 检查 baseY 是否与现有节点冲突
      let newY = baseY;
      for (const node of nodesInSameColumn) {
        const nodeTop = node.position.y;
        const nodeBottom = node.position.y + nodeHeight;
        const newNodeTop = newY;
        const newNodeBottom = newY + nodeHeight;

        // 检查是否有重叠（加上间距）
        if (newNodeTop < nodeBottom + gapY && newNodeBottom + gapY > nodeTop) {
          // 有冲突，将新节点放到该节点下方
          newY = nodeBottom + gapY;
        }
      }

      return newY;
    },
    []
  );

  const { i18n } = useTranslation();

  // Get node types with reactive language switching
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const NODE_TYPES = useMemo(() => getNodeTypes(), [i18n.language]);

  // 添加节点
  const handleAddNode = useCallback(
    (newNodeType: string) => {
      if (!nodeId) return;

      const nodeConfig = NODE_TYPES.find((n) => n.type === newNodeType);
      if (!nodeConfig) return;

      const nodes = getNodes();
      const edges = getEdges();
      const currentNode = nodes.find((n) => n.id === nodeId);

      if (!currentNode) return;

      const newNodeId = `${newNodeType}-${Date.now()}`;
      // 生成可读的节点别名
      const newAlias = generateNodeAlias(
        newNodeType as NodeType,
        nodes as FlowNode[]
      );

      const newX =
        currentNode.position.x +
        LAYOUT_CONFIG.DEFAULT_NODE_WIDTH +
        LAYOUT_CONFIG.NODE_GAP_X;

      // 查找当前节点通过该 handle 连接的所有目标节点
      const sourceHandle = activeHandleId || undefined;
      const existingEdges = edges.filter(
        (e) =>
          e.source === nodeId &&
          (sourceHandle ? e.sourceHandle === sourceHandle : !e.sourceHandle)
      );

      // 基础 Y 坐标计算
      let baseY = currentNode.position.y;
      if (activeHandleId === "false") {
        // "否" 分支默认向下偏移
        baseY += LAYOUT_CONFIG.DEFAULT_NODE_HEIGHT + LAYOUT_CONFIG.NODE_GAP_Y;
      }

      // 如果已有连接，创建并行分支，需要向下偏移
      if (existingEdges.length > 0) {
        // 找出所有已连接节点中最下方的位置
        const connectedNodes = existingEdges
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter((n): n is (typeof nodes)[0] => n !== undefined);

        if (connectedNodes.length > 0) {
          const maxY = Math.max(...connectedNodes.map((n) => n.position.y));
          // 新节点放在最下方节点的下面
          baseY =
            maxY + LAYOUT_CONFIG.DEFAULT_NODE_HEIGHT + LAYOUT_CONFIG.NODE_GAP_Y;
        }
      }

      // 计算不重叠的 Y 坐标
      const newY = findNonOverlappingY(newX, baseY, nodes);

      const newNode = {
        id: newNodeId,
        type: "custom",
        position: { x: newX, y: newY },
        data: {
          nodeType: newNodeType,
          label: nodeConfig.label,
          alias: newAlias,
          config: {},
        },
      };

      // 直接添加新节点和边（保留原有连接，创建并行分支）
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${nodeId}-${newNodeId}`,
          source: nodeId,
          sourceHandle: sourceHandle,
          target: newNodeId,
          type: "addable",
          animated: false,
        },
      ]);

      setMenuOpen(false);
      setActiveHandleId(null);
      setHoveredHandle(null);
    },
    [
      nodeId,
      activeHandleId,
      getNodes,
      getEdges,
      setNodes,
      setEdges,
      findNonOverlappingY,
      NODE_TYPES,
    ]
  );

  // 关闭菜单
  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
    setActiveHandleId(null);
    setHoveredHandle(null);
  }, []);

  // 构建节点的 className
  const nodeClassName = cx(
    styles.customNode,
    selected && "selected",
    ((isStartNode && variables.length > 0) ||
      (isEndNode && outputVariables.length > 0)) &&
      "has-variables"
  );
  const nodeBorderColor = selected ? headerColor : undefined;

  return (
    <div
      ref={nodeRef}
      className={nodeClassName}
      style={nodeBorderColor ? { borderColor: nodeBorderColor } : undefined}
    >
      {/* 输入 Handle - 在左侧偏上方（与 header 区域对齐） */}
      {showInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className={styles.customHandle}
          style={{ backgroundColor: headerColor, top: 20 }}
        />
      )}

      <div
        className={styles.nodeHeader}
        style={{ backgroundColor: headerColor }}
      >
        <span
          className={cx(
            styles.nodeIcon,
            nodeType === NodeType.LLM && StandardIcon && styles.nodeProviderIcon
          )}
        >
          {nodeType === NodeType.LLM ? llmHeaderIcon : icon}
        </span>
        <span className={styles.nodeType}>
          {nodeType === NodeType.LLM ? llmHeaderLabel : nodeType.toUpperCase()}
        </span>
      </div>

      <div className={styles.nodeBody}>
        <div className={styles.nodeLabel}>{label}</div>
        {description && (
          <div className={styles.nodeDescription}>{description}</div>
        )}
        {nodeType === NodeType.LLM && llmModel && (
          <div className={styles.nodeMeta}>
            {llmModel && (
              <div className={styles.nodeMetaItem}>
                <span className={styles.nodeMetaLabel}>模型</span>
                <span className={styles.nodeMetaValue}>{llmModel}</span>
              </div>
            )}
          </div>
        )}

        {/* 开始节点显示变量列表 */}
        {isStartNode && variables.length > 0 && (
          <div className={styles.nodeVariables}>
            {variables.map((variable) => (
              <div key={variable.name} className={styles.nodeVariableItem}>
                <span className={styles.nodeVariableIcon}>
                  {variableTypeIcons[variable.type]}
                </span>
                <span className={styles.nodeVariableName}>{variable.name}</span>
                {variable.required && (
                  <span className={styles.nodeVariableRequired}>必填</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 结束节点显示输出变量列表 */}
        {isEndNode && outputVariables.length > 0 && (
          <div className={cx(styles.nodeVariables, styles.nodeOutputVariables)}>
            {outputVariables.map((variable) => (
              <div key={variable.name} className={styles.nodeVariableItem}>
                <span className={styles.nodeVariableTypeTag}>
                  {variable.type}
                </span>
                <span className={styles.nodeVariableName}>{variable.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 输出 Handle - 在右侧偏上方（与 header 区域对齐） */}
      {showOutputHandle && !isConditionNode && (
        <div
          className={cx(
            styles.handleWrapper,
            (hoveredHandle === "default" || menuOpen) && "hovered"
          )}
          style={{ top: 20 }}
          onClick={(e) => handleHandleClick(e)}
          onMouseEnter={() => setHoveredHandle("default")}
          onMouseLeave={() => !menuOpen && setHoveredHandle(null)}
        >
          <Handle
            type="source"
            position={Position.Right}
            className={cx(styles.customHandle, "custom-handle")}
            style={{ backgroundColor: headerColor }}
          />
          <div className={cx(styles.handleAddButton, "handle-add-button")}>
            <AiOutlinePlus />
          </div>
        </div>
      )}

      {/* 条件节点的动态输出 Handle - 每个分支一个 + ELSE 一个 */}
      {isConditionNode && (
        <>
          {conditionBranches.map((branch, index) => {
            // 为了向后兼容，IF 分支使用 "true"，ELIF 分支使用 "elif-{index}"
            const handleId = branch.type === "if" ? "true" : `elif-${index}`;
            const topPosition = 15 + index * 20;
            return (
              <div
                key={handleId}
                className={cx(
                  styles.handleWrapper,
                  (hoveredHandle === handleId ||
                    (menuOpen && activeHandleId === handleId)) &&
                    "hovered"
                )}
                style={{ top: topPosition }}
                onClick={(e) => handleHandleClick(e, handleId)}
                onMouseEnter={() => setHoveredHandle(handleId)}
                onMouseLeave={() => !menuOpen && setHoveredHandle(null)}
              >
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={cx(styles.customHandle, "custom-handle")}
                  style={{ backgroundColor: "#52c41a" }}
                />
                <div
                  className={cx(styles.handleAddButton, "handle-add-button")}
                >
                  <AiOutlinePlus />
                </div>
              </div>
            );
          })}
          {/* ELSE 分支的输出 Handle - 使用 "false" 保持向后兼容 */}
          <div
            className={cx(
              styles.handleWrapper,
              (hoveredHandle === "false" ||
                (menuOpen && activeHandleId === "false")) &&
                "hovered"
            )}
            style={{ top: 15 + conditionBranches.length * 20 }}
            onClick={(e) => handleHandleClick(e, "false")}
            onMouseEnter={() => setHoveredHandle("false")}
            onMouseLeave={() => !menuOpen && setHoveredHandle(null)}
          >
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className={cx(styles.customHandle, "custom-handle")}
              style={{ backgroundColor: "#ff4d4f" }}
            />
            <div className={cx(styles.handleAddButton, "handle-add-button")}>
              <AiOutlinePlus />
            </div>
          </div>
          {/* 条件分支标签 */}
          <div className={styles.conditionLabelsVertical}>
            {conditionBranches.map((branch, index) => {
              const fallbackLabel =
                branch.type === "if" ? "IF" : `ELIF${index}`;
              const label = branch.alias?.trim() || fallbackLabel;
              return (
                <span
                  key={branch.type === "if" ? "true" : `elif-${index}`}
                  className={cx(
                    styles.conditionLabel,
                    styles.conditionLabelBranch
                  )}
                >
                  {label}
                </span>
              );
            })}
            <span
              className={cx(styles.conditionLabel, styles.conditionLabelElse)}
            >
              ELSE
            </span>
          </div>
        </>
      )}

      <NodeTypeMenu
        open={menuOpen}
        position={menuPosition}
        onSelect={handleAddNode}
        onClose={handleCloseMenu}
        transform="translateY(-50%)"
        menuRef={menuRef}
      />
    </div>
  );
};

export default CustomNode;
