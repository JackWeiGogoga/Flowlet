import { useEffect } from "react";
import { useBreadcrumbContext } from "@/contexts/useBreadcrumbContext.ts";
import type { BreadcrumbItem } from "@/contexts/BreadcrumbContext.types.ts";

/**
 * 设置页面面包屑的 Hook
 * @param items 面包屑项目列表
 * @param deps 依赖项，当依赖变化时更新面包屑
 */
export const useBreadcrumb = (
  items: BreadcrumbItem[],
  deps: React.DependencyList = []
) => {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    // 组件卸载时清空面包屑
    return () => {
      setItems([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export type { BreadcrumbItem };
