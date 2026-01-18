import { createContext } from "react";
import type { BreadcrumbContextValue } from "./BreadcrumbContext.types.ts";

export const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(
  null
);
