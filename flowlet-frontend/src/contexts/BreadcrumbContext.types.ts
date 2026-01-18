export interface BreadcrumbItem {
  /** 显示的标题 */
  title: string;
  /** 跳转路径，如果不提供则为当前页（不可点击） */
  path?: string;
}

export interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}
