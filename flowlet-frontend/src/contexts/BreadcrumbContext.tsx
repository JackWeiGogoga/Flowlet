import React, { useState, useCallback } from "react";
import type { BreadcrumbItem } from "./BreadcrumbContext.types.ts";
import { BreadcrumbContext } from "./BreadcrumbContext.context.ts";

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItemsState] = useState<BreadcrumbItem[]>([]);

  const setItems = useCallback((newItems: BreadcrumbItem[]) => {
    setItemsState(newItems);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
