import React, { useCallback, useState, useRef, useEffect } from "react";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { createStyles } from "antd-style";
import { AiOutlineMessage } from "react-icons/ai";
import { FlowNodeData, NodeConfig } from "@/types";

/**
 * 备注节点配置
 */
export interface NoteNodeConfig extends NodeConfig {
  /** 备注文本内容 */
  content: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 节点宽度 */
  width?: number;
  /** 节点高度 */
  height?: number;
}

// 默认尺寸
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 120;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 80;
const MAX_WIDTH = 600;
const MAX_HEIGHT = 500;

const useStyles = createStyles(({ css }) => ({
  noteNode: css`
    background: #fef9c3;
    border: 1px solid #fde047;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    font-size: 13px;
    cursor: default;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    position: relative;
    display: flex;
    flex-direction: column;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    &.selected {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }

    &.resizing {
      /* 调整大小时禁用过渡动画 */
      transition: none;
    }
  `,
  noteHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px dashed #fde047;
    color: #a16207;
    font-weight: 500;
    font-size: 12px;
    flex-shrink: 0;
  `,
  noteIcon: css`
    font-size: 14px;
    display: flex;
    align-items: center;
  `,
  noteContentWrapper: css`
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  `,
  noteContent: css`
    flex: 1;
    color: #713f12;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 8px 12px;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(161, 98, 7, 0.3);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(161, 98, 7, 0.5);
    }
  `,
  noteTextarea: css`
    flex: 1;
    width: 100%;
    border: none;
    background: transparent;
    color: #713f12;
    font-size: 13px;
    line-height: 1.6;
    resize: none;
    outline: none;
    font-family: inherit;
    padding: 8px 12px;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(161, 98, 7, 0.3);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(161, 98, 7, 0.5);
    }

    &::placeholder {
      color: #a16207;
      opacity: 0.6;
    }
  `,
  notePlaceholder: css`
    color: #a16207;
    opacity: 0.6;
    font-style: italic;
  `,
  resizeHandle: css`
    position: absolute;
    right: 0;
    bottom: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10;

    &::before {
      content: "";
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 8px;
      height: 8px;
      border-right: 2px solid #a16207;
      border-bottom: 2px solid #a16207;
      opacity: 0.5;
    }

    .selected &,
    &:hover {
      opacity: 1;
    }
  `,
}));

interface NoteNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

/**
 * 备注节点组件
 * 用于在画布上添加文本说明，不参与流程执行
 * 支持拖拽调整宽高
 */
const NoteNode: React.FC<NoteNodeProps> = ({ data, selected }) => {
  const { styles, cx } = useStyles();
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // 获取备注配置
  const noteConfig = data.config as NoteNodeConfig | undefined;
  const content = noteConfig?.content || "";
  const width = noteConfig?.width || DEFAULT_WIDTH;
  const height = noteConfig?.height || DEFAULT_HEIGHT;

  // 更新节点配置
  const updateConfig = useCallback(
    (updates: Partial<NoteNodeConfig>) => {
      if (!nodeId) return;

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...((node.data as FlowNodeData).config || {}),
                  ...updates,
                },
              },
            };
          }
          return node;
        })
      );
    },
    [nodeId, setNodes]
  );

  // 更新备注内容
  const updateContent = useCallback(
    (newContent: string) => {
      updateConfig({ content: newContent });
    },
    [updateConfig]
  );

  // 进入编辑模式
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  // 退出编辑模式
  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // 处理文本变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateContent(e.target.value);
    },
    [updateContent]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 阻止事件冒泡，防止触发画布快捷键
    e.stopPropagation();
    // Escape 退出编辑
    if (e.key === "Escape") {
      setIsEditing(false);
      textareaRef.current?.blur();
    }
  }, []);

  // 编辑模式时自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 将光标移到末尾
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // 开始调整大小
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width,
        height,
      };

      // 在调整大小期间禁用节点拖拽
      if (nodeId) {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId ? { ...node, draggable: false } : node
          )
        );
      }
    },
    [width, height, nodeId, setNodes]
  );

  // 处理调整大小
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX)
      );
      const newHeight = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, resizeStartRef.current.height + deltaY)
      );

      updateConfig({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;

      // 恢复节点拖拽
      if (nodeId) {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId ? { ...node, draggable: true } : node
          )
        );
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, updateConfig, nodeId, setNodes]);

  return (
    <div
      ref={nodeRef}
      className={cx(styles.noteNode, selected && "selected", isResizing && "resizing")}
      style={{ width, height }}
    >
      <div className={styles.noteHeader}>
        <span className={styles.noteIcon}>
          <AiOutlineMessage />
        </span>
        <span>{data.label || "备注"}</span>
      </div>

      {/* nowheel 类名阻止 React Flow 捕获滚轮事件 */}
      <div className={`${styles.noteContentWrapper} nowheel`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className={`${styles.noteTextarea} nowheel`}
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="在此输入备注内容..."
          />
        ) : (
          <div
            ref={contentRef}
            className={`${styles.noteContent} nowheel`}
            onDoubleClick={handleDoubleClick}
          >
            {content || (
              <span className={styles.notePlaceholder}>
                双击编辑备注内容...
              </span>
            )}
          </div>
        )}
      </div>

      {/* 调整大小的手柄 - 使用 nodrag 类名阻止 React Flow 拖拽 */}
      <div
        className={`${styles.resizeHandle} nodrag`}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default NoteNode;
