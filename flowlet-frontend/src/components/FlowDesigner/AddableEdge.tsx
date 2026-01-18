import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useStore,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { AiOutlinePlus } from "react-icons/ai";
import { createStyles } from "antd-style";
import { useTranslation } from "react-i18next";
import { getNodeTypes } from "@/config/nodeTypes";
import { getNodeDefaultConfig } from "@/utils/nodeDefaults";
import { NodeTypeMenu } from "./NodeTypeMenu";

// 使用 antd-style 创建样式
const useStyles = createStyles(({ css }) => ({
  edgeAddButtonWrapper: css`
    position: absolute;
    pointer-events: all;
    z-index: 1000;

    /* 让悬浮区域更大，更容易触发 */
    &::before {
      content: "";
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      pointer-events: auto;
    }
  `,
  edgeAddButton: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #1890ff;
    border: 2px solid #fff;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    position: relative;
    z-index: 1001;

    &:hover {
      background: #40a9ff;
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }

    &.visible {
      opacity: 1;
    }
  `,
}));

// 布局常量（与 flowStore 保持一致）
const LAYOUT_CONFIG = {
  NODE_GAP_X: 80,
  DEFAULT_NODE_WIDTH: 180,
};

// 全局状态：通知其他边关闭菜单
const edgeMenuListeners = new Set<(edgeId: string | null) => void>();

const setGlobalOpenEdge = (edgeId: string | null) => {
  edgeMenuListeners.forEach((listener) => listener(edgeId));
};

const AddableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
}) => {
  const { styles, cx } = useStyles();
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuMaxHeight, setMenuMaxHeight] = useState(280);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setNodes, setEdges, getNodes } = useReactFlow();
  const viewportTransform = useStore((state) => state.transform);

  // 监听全局菜单状态变化，关闭其他边的菜单
  useEffect(() => {
    const handleGlobalChange = (openEdgeId: string | null) => {
      if (openEdgeId !== id && menuOpen) {
        setMenuOpen(false);
        setIsHovered(false);
      }
    };
    edgeMenuListeners.add(handleGlobalChange);
    return () => {
      edgeMenuListeners.delete(handleGlobalChange);
    };
  }, [id, menuOpen]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // 检查是否点击了按钮或菜单
      if (
        (wrapperRef.current && wrapperRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      setMenuOpen(false);
      setIsHovered(false);
      setGlobalOpenEdge(null);
    };

    // 延迟添加，避免点击按钮时立即触发
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [menuOpen]);

  const updateMenuPosition = useCallback(() => {
    if (!menuOpen || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.max(200, Math.floor(viewportHeight * 0.6));
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setMenuMaxHeight(maxHeight);

    requestAnimationFrame(() => {
      if (!menuRef.current) return;
      const menuHeight = menuRef.current.getBoundingClientRect().height;
      const padding = 8;
      let top = rect.bottom + 8;
      if (top + menuHeight > viewportHeight - padding) {
        top = rect.top - 8 - menuHeight;
        if (top < padding) {
          top = padding;
        }
      }
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: top,
      });
    });
  }, [menuOpen]);

  // 更新菜单位置，跟随视图变化和首次打开
  useLayoutEffect(() => {
    updateMenuPosition();
  }, [updateMenuPosition, viewportTransform]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleResize = () => updateMenuPosition();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen, updateMenuPosition]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 获取所有下游节点
  const getDownstreamNodes = useCallback(
    (startNodeId: string, edges: { source: string; target: string }[]) => {
      const downstream = new Set<string>();
      const queue = [startNodeId];
      downstream.add(startNodeId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        edges.forEach((edge) => {
          if (edge.source === currentId && !downstream.has(edge.target)) {
            downstream.add(edge.target);
            queue.push(edge.target);
          }
        });
      }
      return downstream;
    },
    []
  );

  const { i18n } = useTranslation("common");

  // Get node types with reactive language switching
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const NODE_TYPES = useMemo(() => getNodeTypes(), [i18n.language]);

  // 在连线中间插入节点
  const handleAddNode = useCallback(
    (nodeType: string) => {
      const nodeConfig = NODE_TYPES.find((n) => n.type === nodeType);
      if (!nodeConfig) return;

      const nodes = getNodes();
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);

      if (!sourceNode || !targetNode) return;

      const requiredSpace =
        LAYOUT_CONFIG.DEFAULT_NODE_WIDTH + LAYOUT_CONFIG.NODE_GAP_X;
      const currentSpace = targetNode.position.x - sourceNode.position.x;

      const newNodeId = `${nodeType}-${Date.now()}`;
      const newX = sourceNode.position.x + requiredSpace;
      const newY = sourceNode.position.y;

      const newNode = {
        id: newNodeId,
        type: "custom",
        position: { x: newX, y: newY },
        data: {
          nodeType: nodeType,
          label: nodeConfig.label,
          config: getNodeDefaultConfig(nodeType),
        },
      };

      setEdges((eds) => {
        const shiftAmount =
          currentSpace < requiredSpace * 2
            ? requiredSpace * 2 - currentSpace
            : 0;

        if (shiftAmount > 0) {
          const downstreamNodeIds = getDownstreamNodes(target, eds);
          setNodes((nds) => {
            const updatedNodes = nds.map((node) => {
              if (downstreamNodeIds.has(node.id)) {
                return {
                  ...node,
                  position: {
                    ...node.position,
                    x: node.position.x + shiftAmount,
                  },
                };
              }
              return node;
            });
            return [...updatedNodes, newNode];
          });
        } else {
          setNodes((nds) => [...nds, newNode]);
        }

        const filteredEdges = eds.filter((e) => e.id !== id);
        return [
          ...filteredEdges,
          {
            id: `edge-${source}-${newNodeId}`,
            source: source,
            target: newNodeId,
            type: "addable",
            animated: false,
          },
          {
            id: `edge-${newNodeId}-${target}`,
            source: newNodeId,
            target: target,
            type: "addable",
            animated: false,
          },
        ];
      });

      // 关闭菜单
      setMenuOpen(false);
      setIsHovered(false);
      setGlobalOpenEdge(null);
    },
    [id, source, target, getNodes, setNodes, setEdges, getDownstreamNodes, NODE_TYPES]
  );

  // 点击按钮
  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (menuOpen) {
        setMenuOpen(false);
        setGlobalOpenEdge(null);
      } else {
        setGlobalOpenEdge(id); // 通知其他边关闭菜单
        setMenuOpen(true);
      }
    },
    [id, menuOpen]
  );

  // 鼠标离开
  const handleMouseLeave = useCallback(() => {
    if (!menuOpen) {
      setIsHovered(false);
    }
  }, [menuOpen]);

  // 关闭菜单
  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
    setIsHovered(false);
    setGlobalOpenEdge(null);
  }, []);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          ref={wrapperRef}
          className={styles.edgeAddButtonWrapper}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={cx(
              styles.edgeAddButton,
              (isHovered || menuOpen) && "visible"
            )}
            onClick={handleButtonClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AiOutlinePlus />
          </button>
        </div>
      </EdgeLabelRenderer>
      <NodeTypeMenu
        open={menuOpen}
        position={menuPosition}
        onSelect={handleAddNode}
        onClose={handleCloseMenu}
        maxHeight={menuMaxHeight}
        menuRef={menuRef}
      />
    </>
  );
};

export default AddableEdge;
