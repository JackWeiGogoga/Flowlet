export type AuthType = "none" | "api-key" | "basic" | "bearer";

/**
 * 获取鉴权类型的显示文本
 */
export const getAuthTypeLabel = (type: AuthType): string => {
  const labels: Record<AuthType, string> = {
    none: "无",
    "api-key": "API Key",
    basic: "Basic",
    bearer: "Bearer",
  };
  return labels[type] || "无";
};
