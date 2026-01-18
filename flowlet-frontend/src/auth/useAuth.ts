import { useAuthStore } from "@/store/authStore";
import { ROLES, RoleType } from "./authConfig";

/**
 * 认证 Hook
 * 提供便捷的认证状态和操作访问
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isRefreshing,
    error,
    login,
    logout,
    hasRole,
    hasAnyRole,
    getRoles,
  } = useAuthStore();

  // 用户基础信息
  const userInfo = user?.profile
    ? {
        id: user.profile.sub,
        username: user.profile.preferred_username as string | undefined,
        email: user.profile.email as string | undefined,
        name: user.profile.name as string | undefined,
        emailVerified: user.profile.email_verified as boolean | undefined,
      }
    : null;

  // 便捷的角色检查
  const isAdmin = hasRole(ROLES.ADMIN);
  const isEditor = hasRole(ROLES.EDITOR) || isAdmin;
  const isViewer = hasRole(ROLES.VIEWER) || isEditor;

  // 获取 Access Token
  const getAccessToken = (): string | null => {
    return user?.access_token || null;
  };

  // Token 是否过期
  const isTokenExpired = (): boolean => {
    return user?.expired ?? true;
  };

  return {
    // 状态
    user,
    userInfo,
    isAuthenticated,
    isLoading,
    isRefreshing,
    error,

    // 操作
    login,
    logout,

    // 角色检查
    hasRole,
    hasAnyRole,
    getRoles,
    isAdmin,
    isEditor,
    isViewer,

    // Token 相关
    getAccessToken,
    isTokenExpired,

    // 常量
    ROLES,
  };
};

/**
 * 权限检查 Hook
 * 用于检查当前用户是否有访问特定资源的权限
 */
export const usePermission = () => {
  const { hasRole, hasAnyRole, isAdmin } = useAuth();

  /**
   * 检查是否可以编辑工作流
   */
  const canEditFlow = (): boolean => {
    return hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]);
  };

  /**
   * 检查是否可以删除工作流
   */
  const canDeleteFlow = (): boolean => {
    return isAdmin;
  };

  /**
   * 检查是否可以执行工作流
   */
  const canExecuteFlow = (): boolean => {
    return hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]);
  };

  /**
   * 检查是否可以访问系统设置
   */
  const canAccessSettings = (): boolean => {
    return isAdmin;
  };

  /**
   * 检查是否可以管理用户
   */
  const canManageUsers = (): boolean => {
    return isAdmin;
  };

  return {
    canEditFlow,
    canDeleteFlow,
    canExecuteFlow,
    canAccessSettings,
    canManageUsers,
    hasRole,
    hasAnyRole,
  };
};

export type { RoleType };
export { ROLES };
