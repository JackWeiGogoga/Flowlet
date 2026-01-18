import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";
import { message } from "antd";
import type { ApiResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/auth/authService";

/**
 * 创建 Axios 实例
 */
const api: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 刷新 Token 的 Promise（用于避免并发刷新）
let refreshingPromise: Promise<boolean> | null = null;

/**
 * 尝试刷新 Token
 * @returns 是否刷新成功
 */
const tryRefreshToken = async (): Promise<boolean> => {
  // 如果已经在刷新中，等待现有的刷新请求
  if (refreshingPromise) {
    return refreshingPromise;
  }

  refreshingPromise = (async () => {
    try {
      console.log("[API] Attempting to refresh token...");
      const user = await authService.signinSilent();
      if (user) {
        console.log("[API] Token refreshed successfully");
        useAuthStore.getState().setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("[API] Token refresh failed:", error);
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
};

/**
 * 请求拦截器 - 自动添加 Authorization Token
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 Zustand store 获取 token（同步）
    const state = useAuthStore.getState();
    const user = state.user;
    const token = user?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("[API] No access token available for:", config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 处理错误
 */
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const { code, message: msg } = response.data;
    if (code !== 200) {
      message.error(msg || "请求失败");
      return Promise.reject(new Error(msg));
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 处理 401 未授权错误 - 尝试刷新 Token 并重试
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      console.warn("[API] Received 401, attempting token refresh...");
      originalRequest._retry = true;

      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // 刷新成功，使用新 Token 重试请求
        const state = useAuthStore.getState();
        const newToken = state.user?.access_token;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          console.log(
            "[API] Retrying request with new token:",
            originalRequest.url
          );
          return api(originalRequest);
        }
      }

      // 刷新失败，提示用户重新登录
      console.error("[API] Token refresh failed, user needs to re-login");
      message.error("登录已过期，请重新登录");

      // 触发登出清理状态，然后重新登录
      const { login } = useAuthStore.getState();
      login();

      return Promise.reject(error);
    }

    // 处理 403 禁止访问
    if (error.response?.status === 403) {
      message.error("您没有权限执行此操作");
      return Promise.reject(error);
    }

    // 其他错误
    const msg =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      "网络错误";
    message.error(msg);
    return Promise.reject(error);
  }
);

export default api;
