import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { authService } from "@/auth/authService";
import { useAuthStore } from "@/store/authStore";

/**
 * OIDC 登录回调页面
 * 处理 Keycloak 登录后的重定向
 */
const CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // 防止重复处理（React Strict Mode 会触发两次）
      if (processedRef.current || isProcessing) {
        return;
      }

      // 检查 URL 中是否有 code 参数
      const code = searchParams.get("code");
      if (!code) {
        // 没有 code，可能是直接访问或已经处理过了
        console.log("[Callback] No code in URL, checking existing session...");
        try {
          const existingUser = await authService.getUser();
          if (existingUser && !existingUser.expired) {
            // 已经登录，直接跳转
            navigate("/flows", { replace: true });
            return;
          }
        } catch {
          console.log("[Callback] No existing session");
        }
        // 没有 code 也没有有效会话，跳转到登录
        setError("无效的回调请求");
        return;
      }

      processedRef.current = true;
      setIsProcessing(true);

      try {
        // 处理登录回调，获取用户信息
        const user = await authService.signinRedirectCallback();

        // 更新全局状态
        setUser(user);

        // 获取登录前的页面路径
        const state = user.state as { returnUrl?: string } | undefined;
        const returnUrl = state?.returnUrl || "/flows";

        // 使用 replace 跳转，避免回退到 callback 页面
        navigate(returnUrl, { replace: true });
      } catch (err) {
        console.error("[Callback] Error processing callback:", err);

        const errorMessage =
          err instanceof Error ? err.message : "登录处理失败";

        // 如果是 "Code not valid" 错误，说明 code 已经使用过了
        if (
          errorMessage.includes("Code not valid") ||
          errorMessage.includes("invalid_grant")
        ) {
          console.log("[Callback] Code already used, checking session...");
          try {
            const existingUser = await authService.getUser();
            if (existingUser && !existingUser.expired) {
              // 已经登录成功，直接跳转
              setUser(existingUser);
              navigate("/flows", { replace: true });
              return;
            }
          } catch {
            // 忽略
          }
        }

        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, setUser, searchParams, isProcessing]);

  const handleRetry = () => {
    // 清除 URL 中的参数，重新发起登录
    window.history.replaceState({}, document.title, "/callback");
    processedRef.current = false;
    authService.signinRedirect();
  };

  const handleGoHome = () => {
    // 先清除任何残留的状态
    authService.removeUser().then(() => {
      navigate("/", { replace: true });
    });
  };

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Result
          status="error"
          title="登录失败"
          subTitle={error}
          extra={[
            <Button key="retry" type="primary" onClick={handleRetry}>
              重新登录
            </Button>,
            <Button key="home" onClick={handleGoHome}>
              返回首页
            </Button>,
          ]}
        />
      </div>
    );
  }

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
      <span style={{ color: "#666" }}>正在处理登录...</span>
    </div>
  );
};

export default CallbackPage;
