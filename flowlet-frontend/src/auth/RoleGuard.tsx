import React, { ReactNode } from "react";
import { Tooltip } from "antd";
import { useAuth } from "./useAuth";

interface RoleGuardProps {
  /** 需要的角色（任一即可） */
  roles: string[];
  /** 有权限时显示的内容 */
  children: ReactNode;
  /** 无权限时显示的内容（可选） */
  fallback?: ReactNode;
  /** 无权限时是否显示 Tooltip 提示 */
  showTooltip?: boolean;
  /** Tooltip 提示文字 */
  tooltipText?: string;
}

/**
 * 角色权限守卫组件
 * 根据用户角色决定是否渲染子组件
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  children,
  fallback = null,
  showTooltip = false,
  tooltipText = "您没有权限执行此操作",
}) => {
  const { hasAnyRole, isAuthenticated } = useAuth();

  // 未登录或无权限
  if (!isAuthenticated || !hasAnyRole(roles)) {
    if (fallback) {
      if (showTooltip) {
        return (
          <Tooltip title={tooltipText}>
            <span style={{ cursor: "not-allowed" }}>{fallback}</span>
          </Tooltip>
        );
      }
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
};

/**
 * 管理员专用组件
 */
export const AdminOnly: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  return (
    <RoleGuard roles={["admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

/**
 * 编辑者及以上组件
 */
export const EditorOnly: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  return (
    <RoleGuard roles={["admin", "editor"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

export default RoleGuard;
