import { useContext } from "react";
import { BreadcrumbContext } from "./BreadcrumbContext.context.ts";

/**
 * 获取面包屑上下文
 */
export const useBreadcrumbContext = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error(
      "useBreadcrumbContext must be used within BreadcrumbProvider"
    );
  }
  return context;
};
