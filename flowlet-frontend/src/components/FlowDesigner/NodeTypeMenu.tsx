import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { createStyles } from "antd-style";
import { useTranslation } from "react-i18next";
import { getNodeTypes, type NodeTypeConfig } from "@/config/nodeTypes";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "./nodeMenuConfig";

// 使用 antd-style 创建样式
const useStyles = createStyles(({ css }) => ({
  menu: css`
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
    padding: 4px;
    min-width: 160px;
    z-index: 99999;
    max-height: 400px;
    overflow-y: auto;

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
  `,
  categoryGroup: css`
    &:not(:first-child) {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #f0f0f0;
    }
  `,
  categoryLabel: css`
    padding: 4px 12px 4px 12px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    font-weight: 500;
  `,
  menuItem: css`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: #f5f5f5;
    }
  `,
  menuIcon: css`
    margin-right: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
  `,
  menuLabel: css`
    font-size: 14px;
    color: #333;
  `,
}));

export interface NodeTypeMenuProps {
  /** 是否显示菜单 */
  open: boolean;
  /** 菜单位置 */
  position: { x: number; y: number };
  /** 选中节点类型时的回调 */
  onSelect: (nodeType: string) => void;
  /** 关闭菜单的回调 */
  onClose: () => void;
  /** 菜单的 CSS transform，默认为 translateX(-50%) */
  transform?: string;
  /** 菜单的最大高度，默认为 400 */
  maxHeight?: number;
  /** 过滤掉的节点类型，默认过滤 start */
  excludeTypes?: string[];
  /** 菜单容器的 ref */
  menuRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 节点类型选择菜单组件
 * 用于在流程编辑器中选择要添加的节点类型
 * 支持分类展示，共享给右键菜单、边上的加号按钮、节点 Handle 上的加号按钮使用
 */
export const NodeTypeMenu: React.FC<NodeTypeMenuProps> = ({
  open,
  position,
  onSelect,
  transform = "translateX(-50%)",
  maxHeight = 400,
  excludeTypes = ["start"],
  menuRef,
}) => {
  const { styles } = useStyles();
  const { i18n } = useTranslation("common");

  // 获取节点类型配置，支持语言切换
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const NODE_TYPES = useMemo(() => getNodeTypes(), [i18n.language]);

  // 过滤掉排除的节点类型
  const menuNodeTypes = useMemo(
    () => NODE_TYPES.filter((node) => !excludeTypes.includes(node.type)),
    [NODE_TYPES, excludeTypes]
  );

  // 按分类分组节点类型
  const groupedNodeTypes = useMemo(() => {
    const categoryMap: Record<string, NodeTypeConfig[]> = {};

    menuNodeTypes.forEach((config) => {
      const category = config.category;
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(config);
    });

    return categoryMap;
  }, [menuNodeTypes]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={styles.menu}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        transform,
        maxHeight,
      }}
    >
      {CATEGORY_ORDER.map((category) => {
        const categoryNodes = groupedNodeTypes[category];
        if (!categoryNodes || categoryNodes.length === 0) return null;

        return (
          <div key={category} className={styles.categoryGroup}>
            <div className={styles.categoryLabel}>
              {CATEGORY_LABELS[category] || category}
            </div>
            {categoryNodes.map((node) => (
              <div
                key={node.type}
                className={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node.type);
                }}
              >
                <span className={styles.menuIcon} style={{ color: node.color }}>
                  {node.icon}
                </span>
                <span className={styles.menuLabel}>{node.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default NodeTypeMenu;
