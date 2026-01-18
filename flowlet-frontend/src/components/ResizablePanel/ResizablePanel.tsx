import React, { useState, useEffect, useCallback } from "react";
import { Button, Tooltip } from "antd";
import {
  AiOutlineLeft,
  AiOutlineRight,
  AiOutlineDoubleLeft,
  AiOutlineDoubleRight,
} from "react-icons/ai";
import { useStyles } from "./ResizablePanel.style";

interface ResizablePanelProps {
  children: React.ReactNode;
  title?: string;
  position: "left" | "right";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultCollapsed?: boolean;
  collapsed?: boolean; // 外部控制折叠状态
  showCollapseButton?: boolean; // 是否显示折叠按钮
  onCollapsedChange?: (collapsed: boolean) => void;
  onWidthChange?: (width: number) => void;
  className?: string;
  /** 标题栏右侧额外操作区域 */
  extra?: React.ReactNode;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  title,
  position,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 500,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  showCollapseButton = true,
  onCollapsedChange,
  onWidthChange,
  className = "",
  extra,
}) => {
  const { styles, cx } = useStyles();
  const [width, setWidth] = useState(defaultWidth);
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [isResizing, setIsResizing] = useState(false);

  // 支持受控和非受控模式
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // 处理拖拽移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      let newWidth: number;
      if (position === "left") {
        newWidth = e.clientX;
      } else {
        newWidth = window.innerWidth - e.clientX;
      }

      // 限制宽度范围
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, position, minWidth, maxWidth, onWidthChange]);

  // 切换折叠状态
  const toggleCollapsed = useCallback(() => {
    const newCollapsed = !collapsed;
    if (!isControlled) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapsedChange?.(newCollapsed);
  }, [collapsed, isControlled, onCollapsedChange]);

  // 获取折叠按钮图标
  const getCollapseIcon = () => {
    if (position === "left") {
      return collapsed ? <AiOutlineDoubleRight /> : <AiOutlineDoubleLeft />;
    } else {
      return collapsed ? <AiOutlineDoubleLeft /> : <AiOutlineDoubleRight />;
    }
  };

  // 获取展开按钮图标
  const getExpandIcon = () => {
    if (position === "left") {
      return <AiOutlineRight />;
    } else {
      return <AiOutlineLeft />;
    }
  };

  return (
    <div
      className={cx(
        styles.panel,
        position,
        collapsed && "collapsed",
        className
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      {/* 面板内容 */}
      <div
        className={styles.panelContent}
        style={{ width: collapsed ? 0 : width }}
      >
        {/* 标题栏（可选） */}
        {title && !collapsed && (
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{title}</span>
            <div className={styles.panelHeaderActions}>
              {extra}
              {showCollapseButton && (
                <Tooltip
                  title="收起面板"
                  placement={position === "left" ? "right" : "left"}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={getCollapseIcon()}
                    onClick={toggleCollapsed}
                    className={styles.collapseBtn}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        )}
        {/* 面板主体 */}
        {!collapsed && <div className={styles.panelBody}>{children}</div>}
      </div>

      {/* 拖拽手柄 */}
      {!collapsed && (
        <div
          className={cx(styles.resizeHandle, position, isResizing && "active")}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* 折叠时的展开按钮（仅在非受控模式下显示） */}
      {collapsed && showCollapseButton && !isControlled && (
        <div className={cx(styles.expandTrigger, position)}>
          <Tooltip
            title="展开面板"
            placement={position === "left" ? "right" : "left"}
          >
            <Button
              type="primary"
              size="small"
              icon={getExpandIcon()}
              onClick={toggleCollapsed}
              className={styles.expandBtn}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default ResizablePanel;
