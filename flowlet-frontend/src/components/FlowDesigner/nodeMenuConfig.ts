/**
 * 节点菜单分类配置
 */

// 分类显示顺序
export const CATEGORY_ORDER = ["control", "action", "ai", "utility"];

// 分类显示名称
export const CATEGORY_LABELS: Record<string, string> = {
  control: "流程控制",
  action: "动作节点",
  ai: "AI 节点",
  utility: "工具节点",
};
