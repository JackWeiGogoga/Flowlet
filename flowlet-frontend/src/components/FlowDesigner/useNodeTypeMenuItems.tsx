import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getNodeTypes, type NodeTypeConfig } from "@/config/nodeTypes";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "./nodeMenuConfig";

/**
 * 构建 Ant Design Menu 的 items 配置
 * 用于 Dropdown 组件的右键菜单
 */
export const useNodeTypeMenuItems = (
  onSelect: (nodeType: string) => void,
  excludeTypes: string[] = ["start"]
) => {
  const { i18n } = useTranslation("common");

  // 获取节点类型配置，支持语言切换
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const NODE_TYPES = useMemo(() => getNodeTypes(), [i18n.language]);

  // 构建 AntD Menu 的 items
  const menuItems = useMemo(() => {
    const menuNodeTypes = NODE_TYPES.filter(
      (node) => !excludeTypes.includes(node.type)
    );

    // 按分类分组
    const categoryMap: Record<string, NodeTypeConfig[]> = {};
    menuNodeTypes.forEach((config) => {
      const category = config.category;
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(config);
    });

    // 构建分类菜单
    return CATEGORY_ORDER.filter(
      (category) =>
        categoryMap[category] && categoryMap[category].length > 0
    ).map((category) => ({
      key: `group-${category}`,
      type: "group" as const,
      label: CATEGORY_LABELS[category] || category,
      children: categoryMap[category].map((node) => ({
        key: node.type,
        icon: (
          <span style={{ color: node.color, display: "flex" }}>{node.icon}</span>
        ),
        label: node.label,
        onClick: () => onSelect(node.type),
      })),
    }));
  }, [NODE_TYPES, excludeTypes, onSelect]);

  return menuItems;
};
