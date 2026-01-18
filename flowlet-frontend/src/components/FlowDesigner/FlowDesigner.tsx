import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  SelectionMode,
  type Node,
  type Edge,
  type ReactFlowInstance,
  type OnNodesChange,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, Tooltip, Divider, Dropdown, type MenuProps } from "antd";
import { createStyles } from "antd-style";
import {
  AiOutlineLayout,
  AiOutlineZoomIn,
  AiOutlineZoomOut,
  AiOutlineExpand,
  AiOutlineUndo,
  AiOutlineRedo,
  AiOutlineCheck,
  AiOutlineDrag,
} from "react-icons/ai";
import { LuMousePointer2 } from "react-icons/lu";
import { useNodeTypeMenuItems } from "./useNodeTypeMenuItems";
import {
  useFlowStore,
  generateNodeAlias,
  type FlowNode,
} from "@/store/flowStore";
import { NodeType, FlowNodeData } from "@/types";
import { getNodeDefaultConfig } from "@/utils/nodeDefaults";
import CustomNode from "../nodes/CustomNode";
import { NoteNode } from "../nodes";
import AddableEdge from "./AddableEdge";
import NodePalette from "../NodePalette/NodePalette";
import NodeConfigPanel from "../NodeConfigPanel/NodeConfigPanel";
import { message } from "@/components/AppMessageContext/staticMethods";

// 使用 antd-style 创建样式
const useStyles = createStyles(({ css }) => ({
  flowDesigner: css`
    display: flex;
    height: 100%;
    background: #f5f5f5;
    position: relative;
    overflow: hidden;
  `,
  flowCanvasWrapper: css`
    flex: 1;
    height: 100%;
    position: relative;
    min-width: 0;
  `,
  // ReactFlow 相关样式
  reactFlowCustomNode: css`
    font-size: 12px;
  `,
  // 控制面板样式
  flowControlPanel: css`
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    gap: 4px;

    .control-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .control-divider {
      height: 20px;
      margin: 0 4px;
      border-color: #e8e8e8;
    }

    .zoom-level {
      min-width: 40px;
      text-align: center;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      user-select: none;
    }

    .zoom-level-clickable {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f5ff;
        color: #1890ff;
      }
    }

    .ant-btn {
      color: #666;
      padding: 4px 8px;
      height: 28px;
      width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        color: #1890ff;
        background: #f0f5ff;
      }

      &:disabled {
        color: #bfbfbf;
      }
    }

    .mode-toggle-group .ant-btn.mode-active {
      color: #1890ff;
      background: #e6f4ff;

      &:hover {
        background: #bae0ff;
      }
    }
  `,
  // 指针模式样式
  pointerMode: css`
    cursor: crosshair;

    .react-flow__pane {
      cursor: crosshair;
    }

    .react-flow__node.selected {
      box-shadow: 0 0 0 2px #1890ff, 0 4px 12px rgba(24, 144, 255, 0.3);
    }

    .react-flow__node:hover {
      box-shadow: 0 0 0 1px #1890ff;
    }
  `,
  // 手模式样式
  handMode: css`
    cursor: grab;

    .react-flow__pane {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    }

    .react-flow__node.selected {
      box-shadow: none;
    }
  `,
  // 全局 ReactFlow 样式覆盖
  reactFlowOverrides: css`
    .react-flow__node-custom {
      font-size: 12px;
    }

    .react-flow__edge-path {
      stroke-width: 2;
    }

    .react-flow__controls {
      display: none;
    }

    .react-flow__minimap {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
    }

    .react-flow__selection {
      background: rgba(24, 144, 255, 0.08);
      border: 1px dashed #1890ff;
      border-radius: 4px;
    }

    .react-flow__panel.bottom-left {
      left: 10px;
      bottom: 10px;
    }
  `,
  // 右键菜单样式 - 限制最大高度并支持滚动
  contextMenuDropdown: css`
    .ant-dropdown-menu {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;

      /* 自定义滚动条样式 */
      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 3px;
      }
      &::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.25);
      }
    }
  `,
}));

// 注册自定义节点类型
const nodeTypes = {
  custom: CustomNode,
  note: NoteNode,
} as const;

// 注册自定义边类型
const edgeTypes = {
  addable: AddableEdge,
} as const;

let nodeIdCounter = 0;
const generateNodeId = () => `node_${Date.now()}_${++nodeIdCounter}`;
let edgeIdCounter = 0;
const generateEdgeId = () => `edge_${Date.now()}_${++edgeIdCounter}`;

// 交互模式类型
type InteractionMode = "hand" | "pointer";

const FlowDesignerInner: React.FC = () => {
  const { styles, cx } = useStyles();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lastPointerDownInCanvasRef = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  // 交互模式：hand=手模式（拖动画布），pointer=指针模式（框选节点）
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("hand");

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    flowPosition: XYPosition;
  } | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setNodes,
    setEdges,
    setSelectedNode,
    autoLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFlowStore();

  // 节点选中事件
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Note 节点不需要展开配置面板
      const nodeData = node.data as FlowNodeData;
      if (nodeData.nodeType === NodeType.NOTE) {
        return;
      }
      setSelectedNode(node as Node<FlowNodeData>);
    },
    [setSelectedNode]
  );

  // 点击画布空白处取消选中
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    // 关闭右键菜单
    setContextMenu(null);
  }, [setSelectedNode]);

  // 画布右键菜单
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      // 计算流程坐标
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        flowPosition,
      });
    },
    [reactFlowInstance]
  );

  // 通过右键菜单添加节点
  const handleAddNodeFromContextMenu = useCallback(
    (nodeType: string) => {
      if (!contextMenu) return;

      const nodeTypeEnum = nodeType as NodeType;

      // 检查是否已存在开始节点
      if (nodeTypeEnum === NodeType.START) {
        const hasStart = nodes.some((n) => n.data.nodeType === NodeType.START);
        if (hasStart) {
          message.warning("流程中只能有一个开始节点");
          setContextMenu(null);
          return;
        }
      }

      // 备注节点使用特殊的 node type
      const reactFlowNodeType = nodeTypeEnum === NodeType.NOTE ? "note" : "custom";

      const newNode: Node<FlowNodeData> = {
        id: generateNodeId(),
        type: reactFlowNodeType,
        position: contextMenu.flowPosition,
        data: {
          label: nodeType,
          nodeType: nodeTypeEnum,
          config: getNodeDefaultConfig(nodeTypeEnum),
        },
      };

      addNode(newNode);
      setContextMenu(null);
    },
    [contextMenu, nodes, addNode]
  );

  // 使用共享的 hook 构建右键菜单项 - 不排除任何节点类型（包括 start）
  const contextMenuItems = useNodeTypeMenuItems(handleAddNodeFromContextMenu, []);

  // 拖放处理 - 允许拖放
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 拖放处理 - 放置节点
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const nodeType = event.dataTransfer.getData(
        "application/reactflow"
      ) as NodeType;
      const nodeLabel = event.dataTransfer.getData("nodeLabel");

      if (!nodeType) return;

      // 检查是否已存在开始节点（开始节点只能有一个）
      if (nodeType === NodeType.START) {
        const hasStart = nodes.some((n) => n.data.nodeType === NodeType.START);
        if (hasStart) {
          message.warning("流程中只能有一个开始节点");
          return;
        }
      }
      // 结束节点可以有多个，不做限制

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 备注节点使用特殊的 node type
      const reactFlowNodeType = nodeType === NodeType.NOTE ? "note" : "custom";

      const newNode: Node<FlowNodeData> = {
        id: generateNodeId(),
        type: reactFlowNodeType,
        position,
        data: {
          label: nodeLabel || nodeType,
          nodeType,
          config: getNodeDefaultConfig(nodeType),
        },
      };

      addNode(newNode);
    },
    [reactFlowInstance, nodes, addNode]
  );

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2, maxZoom: 1 });
  }, [reactFlowInstance]);

  // 设置特定缩放比例
  const handleSetZoom = useCallback(
    (zoom: number) => {
      reactFlowInstance?.zoomTo(zoom);
      setZoomLevel(Math.round(zoom * 100));
    },
    [reactFlowInstance]
  );

  // 缩放比例菜单
  const zoomMenuItems: MenuProps["items"] = [
    {
      key: "fit",
      label: "适应画布",
      icon: <AiOutlineExpand />,
      onClick: handleFitView,
    },
    { type: "divider" as const, key: "divider" },
    ...[
      { key: "200", label: "200%", zoom: 2 },
      { key: "150", label: "150%", zoom: 1.5 },
      { key: "100", label: "100%", zoom: 1 },
      { key: "75", label: "75%", zoom: 0.75 },
      { key: "50", label: "50%", zoom: 0.5 },
      { key: "25", label: "25%", zoom: 0.25 },
    ].map((item) => {
      const isCurrentZoom = Math.abs(zoomLevel - parseInt(item.key)) < 5;
      return {
        key: item.key,
        label: item.label,
        icon: isCurrentZoom ? <AiOutlineCheck /> : null,
        style: isCurrentZoom
          ? { color: "#1890ff", fontWeight: 500 }
          : undefined,
        onClick: () => handleSetZoom(item.zoom),
      };
    }),
  ];

  // 自动布局
  const handleAutoLayout = useCallback(() => {
    autoLayout();
    // 延迟执行 fitView 确保布局完成
    setTimeout(() => {
      reactFlowInstance?.fitView({
        padding: 0.3,
        maxZoom: 0.8, // 最大 80%，避免过大
        minZoom: 0.3, // 最小 30%
      });
    }, 50);
    message.success("已自动整理布局");
  }, [autoLayout, reactFlowInstance]);

  // 视图变化时更新缩放级别
  const onMoveEnd = useCallback(() => {
    if (reactFlowInstance) {
      setZoomLevel(Math.round(reactFlowInstance.getZoom() * 100));
    }
  }, [reactFlowInstance]);

  const copyBufferRef = useRef<{
    nodes: Array<Pick<FlowNode, "id" | "type" | "position" | "data">>;
    edges: Array<
      Pick<
        Edge,
        | "source"
        | "target"
        | "sourceHandle"
        | "targetHandle"
        | "label"
        | "type"
        | "animated"
      >
    >;
  } | null>(null);
  const pasteOffsetRef = useRef(1);

  const copySelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) {
      message.warning("请先选中要复制的节点");
      return;
    }

    const filteredNodes = selectedNodes.filter(
      (node) => node.data.nodeType !== NodeType.START
    );

    if (filteredNodes.length === 0) {
      message.warning("开始节点不可复制");
      return;
    }

    if (filteredNodes.length !== selectedNodes.length) {
      message.warning("开始节点不可复制，已忽略");
    }

    const selectedNodeIds = new Set(filteredNodes.map((node) => node.id));
    const selectedEdges = edges.filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    copyBufferRef.current = {
      nodes: filteredNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: { ...node.position },
        data: structuredClone(node.data),
      })),
      edges: selectedEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        type: edge.type,
        animated: edge.animated,
      })),
    };
    pasteOffsetRef.current = 1;
    message.success("已复制节点");
  }, [edges, nodes]);

  const pasteCopiedNodes = useCallback(() => {
    if (!copyBufferRef.current) {
      message.warning("没有可粘贴的节点");
      return;
    }

    const offset = 30 * pasteOffsetRef.current;
    pasteOffsetRef.current += 1;

    const idMap = new Map<string, string>();
    const newNodes: FlowNode[] = [];
    copyBufferRef.current.nodes.forEach((node) => {
      const newId = generateNodeId();
      idMap.set(node.id, newId);

      const newAlias = node.data.alias
        ? generateNodeAlias(node.data.nodeType, [...nodes, ...newNodes])
        : undefined;

      newNodes.push({
        id: newId,
        type: node.type || "custom",
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset,
        },
        data: {
          ...structuredClone(node.data),
          ...(newAlias ? { alias: newAlias } : {}),
        },
        selected: true,
      });
    });

    const newEdges: Edge[] = copyBufferRef.current.edges.map((edge) => ({
      id: generateEdgeId(),
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      type: edge.type || "addable",
      animated: edge.animated ?? false,
    }));

    const clearedNodes = nodes.map((node) =>
      node.selected ? { ...node, selected: false } : node
    );

    setNodes([...clearedNodes, ...newNodes]);
    if (newEdges.length > 0) {
      setEdges([...edges, ...newEdges]);
    }
    setSelectedNode(newNodes[0] || null);
  }, [edges, nodes, setEdges, setNodes, setSelectedNode]);

  // 键盘快捷键支持
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      lastPointerDownInCanvasRef.current =
        !!reactFlowWrapper.current && reactFlowWrapper.current.contains(target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果焦点在输入框内，不处理快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".monaco-editor")
      ) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const isInCanvas =
        !!reactFlowWrapper.current &&
        (reactFlowWrapper.current.contains(target) ||
          (activeElement ? reactFlowWrapper.current.contains(activeElement) : false) ||
          (path.length > 0 && path.includes(reactFlowWrapper.current)) ||
          activeElement === document.body ||
          activeElement === null ||
          lastPointerDownInCanvasRef.current);

      const key = event.key.toLowerCase();
      const selection = window.getSelection();
      const hasTextSelection =
        !!selection && !selection.isCollapsed && selection.toString().length > 0;

      // Ctrl+Z / Cmd+Z: 撤销
      if (
        (event.ctrlKey || event.metaKey) &&
        key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        if (isInCanvas && canUndo()) {
          undo();
        }
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z 或 Ctrl+Y / Cmd+Y: 重做
      if (
        ((event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          key === "z") ||
        ((event.ctrlKey || event.metaKey) && key === "y")
      ) {
        event.preventDefault();
        if (isInCanvas && canRedo()) {
          redo();
        }
      }

      // Ctrl+C / Cmd+C: 复制节点
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        if (hasTextSelection) {
          return;
        }
        if (!isInCanvas) {
          return;
        }
        event.preventDefault();
        copySelectedNodes();
      }

      // Ctrl+V / Cmd+V: 粘贴节点
      if ((event.ctrlKey || event.metaKey) && key === "v") {
        if (!isInCanvas) {
          return;
        }
        event.preventDefault();
        pasteCopiedNodes();
      }

      // V 键：切换到指针模式
      if (event.key === "v" || event.key === "V") {
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          setInteractionMode("pointer");
        }
      }

      // H 键：切换到手模式
      if (event.key === "h" || event.key === "H") {
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          setInteractionMode("hand");
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [undo, redo, canUndo, canRedo, copySelectedNodes, pasteCopiedNodes]);

  // 根据交互模式获取 ReactFlow 的 className
  const reactFlowClassName = cx(
    styles.reactFlowOverrides,
    interactionMode === "pointer" ? styles.pointerMode : styles.handMode
  );

  return (
    <div className={styles.flowDesigner}>
      <NodePalette />
      <div className={styles.flowCanvasWrapper} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes as Node[]}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            setZoomLevel(Math.round(instance.getZoom() * 100));
          }}
          onMoveEnd={onMoveEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{
            padding: 0.3,
            maxZoom: 1, // 最大缩放比例为 100%，避免初始时过大
          }}
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "addable",
            animated: false,
          }}
          // 交互模式控制
          panOnDrag={interactionMode === "hand"} // 手模式时拖动画布
          selectionOnDrag={interactionMode === "pointer"} // 指针模式时框选
          selectionMode={SelectionMode.Partial} // 部分相交即选中
          selectNodesOnDrag={interactionMode === "pointer"} // 指针模式时可以拖动选中节点
          panOnScroll={interactionMode === "pointer"} // 指针模式时滚轮移动画布
          panActivationKeyCode={null} // 禁用空格键临时平移，避免与编辑器冲突
          className={reactFlowClassName}
          onPaneContextMenu={onPaneContextMenu}
        >
          <Background gap={15} size={1} />

          {/* 左下角 MiniMap */}
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            position="bottom-left"
            style={{ marginBottom: 60 }}
          />

          {/* 左下角控制工具栏 - 参考 Dify 布局 */}
          <Panel position="bottom-left" className={styles.flowControlPanel}>
            {/* 交互模式切换组 */}
            <div className="control-group mode-toggle-group">
              <Tooltip title="指针模式 (V) - 框选节点" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<LuMousePointer2 />}
                  onClick={() => setInteractionMode("pointer")}
                  className={interactionMode === "pointer" ? "mode-active" : ""}
                />
              </Tooltip>
              <Tooltip title="手模式 (H) - 拖动画布" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineDrag />}
                  onClick={() => setInteractionMode("hand")}
                  className={interactionMode === "hand" ? "mode-active" : ""}
                />
              </Tooltip>
            </div>

            <Divider orientation="vertical" className="control-divider" />

            {/* 缩放控制组 */}
            <div className="control-group">
              <Tooltip title="缩小" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineZoomOut />}
                  onClick={handleZoomOut}
                />
              </Tooltip>
              <Dropdown
                menu={{ items: zoomMenuItems }}
                trigger={["click"]}
                placement="top"
              >
                <span className="zoom-level zoom-level-clickable">
                  {zoomLevel}%
                </span>
              </Dropdown>
              <Tooltip title="放大" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineZoomIn />}
                  onClick={handleZoomIn}
                />
              </Tooltip>
            </div>

            <Divider orientation="vertical" className="control-divider" />

            {/* 撤销/重做组 */}
            <div className="control-group">
              <Tooltip title="撤销 (Ctrl+Z)" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineUndo />}
                  onClick={undo}
                  disabled={!canUndo()}
                />
              </Tooltip>
              <Tooltip title="重做 (Ctrl+Shift+Z)" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineRedo />}
                  onClick={redo}
                  disabled={!canRedo()}
                />
              </Tooltip>
            </div>

            <Divider orientation="vertical" className="control-divider" />

            {/* 布局控制组 */}
            <div className="control-group">
              <Tooltip title="整理布局" placement="top">
                <Button
                  type="text"
                  size="small"
                  icon={<AiOutlineLayout />}
                  onClick={handleAutoLayout}
                />
              </Tooltip>
            </div>
          </Panel>
        </ReactFlow>

        {/* 右键菜单 */}
        {contextMenu && contextMenu.visible && (
          <Dropdown
            menu={{ items: contextMenuItems }}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setContextMenu(null);
              }
            }}
            trigger={["contextMenu"]}
            overlayClassName={`${styles.contextMenuDropdown} nowheel`}
            getPopupContainer={() => document.body}
          >
            <div
              style={{
                position: "fixed",
                left: contextMenu.x,
                top: contextMenu.y,
                width: 1,
                height: 1,
              }}
            />
          </Dropdown>
        )}
      </div>
      <NodeConfigPanel />
    </div>
  );
};

const FlowDesigner: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner />
    </ReactFlowProvider>
  );
};

export default FlowDesigner;
