import React, { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Result, Button, Spin } from "antd";
import { useAuth } from "./useAuth";

interface PrivateRouteProps {
  children: ReactNode;
  /** 需要的角色（任一即可） */
  roles?: string[];
  /** 无权限时的跳转地址 */
  redirectTo?: string;
  /** 无权限时显示的组件 */
  fallback?: ReactNode;
}

/**
 * 私有路由守卫
 * 检查用户是否已登录，未登录则跳转到登录页
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  roles,
  redirectTo,
  fallback,
}) => {
  const { isAuthenticated, isLoading, hasAnyRole, login, isRefreshing } =
    useAuth();
  const location = useLocation();

  // 使用 ref 追踪是否已触发登录，避免重复调用
  const hasTriggeredLoginRef = useRef(false);

  // 派生 isRedirecting 状态，而不是在 effect 中设置
  // 正在刷新 token 时不应该触发重定向
  const isRedirecting =
    !isLoading && !isAuthenticated && !redirectTo && !isRefreshing;

  // 未登录时自动跳转
  useEffect(() => {
    if (isRedirecting && !hasTriggeredLoginRef.current) {
      hasTriggeredLoginRef.current = true;
      login(location.pathname + location.search);
    }
  }, [isRedirecting, login, location]);

  // 当认证状态改变时重置 ref
  useEffect(() => {
    if (isAuthenticated) {
      hasTriggeredLoginRef.current = false;
    }
  }, [isAuthenticated]);

  // 加载中或正在重定向
  if (isLoading || isRedirecting) {
    return (
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
          {isRedirecting ? "正在跳转到登录页..." : "正在验证身份..."}
        </span>
      </div>
    );
  }

  // 未登录且有重定向地址
  if (!isAuthenticated) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // 如果没有 redirectTo，显示加载状态（login 会在 useEffect 中触发）
    return (
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
        <span style={{ color: "#666" }}>正在跳转到登录页...</span>
      </div>
    );
  }

  // 检查角色权限
  if (roles && roles.length > 0 && !hasAnyRole(roles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

/**
 * 公开路由
 * 已登录用户访问时重定向到首页（如登录页）
 */
export const PublicRoute: React.FC<{
  children: ReactNode;
  redirectTo?: string;
}> = ({ children, redirectTo = "/flows" }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    // 如果有 from 参数，跳转回原页面
    const from =
      (location.state as { from?: Location })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
