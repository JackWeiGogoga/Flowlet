import React, { useEffect, ReactNode, useCallback, useState } from "react";
import { Spin } from "antd";
import { useAuthStore } from "@/store/authStore";
import { useTenantStore, Tenant } from "@/store/tenantStore";
import { useProjectStore } from "@/store/projectStore";
import { userService } from "@/services/userService";

interface AuthProviderProps {
  children: ReactNode;
  /** 加载时显示的内容 */
  loadingComponent?: ReactNode;
  /** 是否启用认证（开发时可关闭） */
  enabled?: boolean;
}

/**
 * 从用户信息中提取租户列表
 * 租户信息通常存储在 JWT 的 claims 中
 */
const extractTenantsFromUser = (user: unknown): Tenant[] => {
  // 尝试从用户信息中获取租户
  const profile = (user as { profile?: Record<string, unknown> })?.profile;

  // 如果 profile 中有 tenants 信息
  if (profile?.tenants && Array.isArray(profile.tenants)) {
    return profile.tenants as Tenant[];
  }

  // 如果没有多租户信息，创建一个默认租户（基于用户的 realm）
  const issuer = profile?.iss as string;
  if (issuer) {
    const realmMatch = issuer.match(/\/realms\/([^/]+)/);
    if (realmMatch) {
      const realmName = realmMatch[1];
      return [
        {
          id: realmName,
          name: realmName,
          displayName: realmName.charAt(0).toUpperCase() + realmName.slice(1),
        },
      ];
    }
  }

  // 默认返回一个示例租户（用于演示）
  return [
    {
      id: "default",
      name: "default",
      displayName: "默认租户",
    },
  ];
};

/**
 * 认证 Provider
 * 包裹应用根组件，初始化认证状态和租户信息
 * 注意：项目列表由 ProjectSwitcher 组件负责加载
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  loadingComponent,
  enabled = true,
}) => {
  const { isLoading, initialize, user, isAuthenticated } = useAuthStore();
  const { initialize: initializeTenant } = useTenantStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [isInitializing, setIsInitializing] = useState(false);

  // 初始化认证
  useEffect(() => {
    if (enabled) {
      initialize();
    } else {
      // 未启用认证时，直接设置为已加载
      useAuthStore.setState({ isLoading: false });
    }
  }, [enabled, initialize]);

  // 用户初始化：首次登录时创建默认项目
  const initializeUser = useCallback(async () => {
    try {
      setIsInitializing(true);

      // 调用后端初始化接口
      const result = await userService.initialize();

      // 如果有默认项目，且当前没有选中的项目，才设置为当前项目
      // 避免覆盖用户之前选择的项目（持久化在 localStorage 中）
      if (result.defaultProjectId && !currentProject) {
        setCurrentProject({
          id: result.defaultProjectId,
          name: result.defaultProjectName,
          description: "",
          createdBy: "",
          ownerId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[AuthProvider] Failed to initialize user:", error);
      // 初始化失败不阻塞用户使用，只记录日志
    } finally {
      setIsInitializing(false);
    }
  }, [currentProject, setCurrentProject]);

  // 认证成功后初始化租户和用户（仅首次登录时执行）
  const hasInitializedRef = React.useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      // 初始化租户（即使隐藏也保留数据）
      const tenants = extractTenantsFromUser(user);
      initializeTenant(tenants);

      // 初始化用户（创建默认项目等）
      initializeUser();
    }
  }, [isAuthenticated, user, initializeTenant, initializeUser]);

  // 显示加载状态
  if (enabled && (isLoading || isInitializing)) {
    return (
      <>
        {loadingComponent || (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Spin size="large" />
            <span style={{ color: "#666" }}>
              {isInitializing ? "正在初始化用户数据..." : "正在验证身份..."}
            </span>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
