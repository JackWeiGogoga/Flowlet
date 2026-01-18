import { create } from "zustand";
import { User } from "oidc-client-ts";
import { authService } from "@/auth/authService";

interface AuthState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  _eventsRegistered: boolean; // 标记事件是否已注册

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;

  // 异步操作
  initialize: () => Promise<void>;
  login: (returnUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // 权限检查
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getRoles: () => string[];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // 初始状态
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isRefreshing: false,
  error: null,
  _eventsRegistered: false,

  // 基础 setters
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user && (!user.expired || get().isRefreshing),
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setRefreshing: (isRefreshing) => set({ isRefreshing }),

  setError: (error) => set({ error }),

  // 初始化：检查是否已登录
  initialize: async () => {
    // 防止重复初始化
    if (get()._eventsRegistered) {
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authService.getUser();
      set({
        user,
        isAuthenticated: !!user && !user.expired,
        isLoading: false,
        error: null,
        _eventsRegistered: true,
      });

      // 注册事件监听（只注册一次）
      const userManager = authService.getUserManager();

      // Token 即将过期时，标记为刷新中
      userManager.events.addAccessTokenExpiring(() => {
        set({ isRefreshing: true });
      });

      // Token 刷新成功后更新用户
      userManager.events.addUserLoaded((loadedUser) => {
        set({
          user: loadedUser,
          isAuthenticated: true,
          isRefreshing: false,
        });
      });

      // 用户登出
      userManager.events.addUserUnloaded(() => {
        set({ user: null, isAuthenticated: false, isRefreshing: false });
      });

      // 静默刷新失败
      userManager.events.addSilentRenewError((error) => {
        console.error("[AuthStore] Silent renew error:", error);
        set({ isRefreshing: false });
        const currentUser = get().user;
        if (currentUser?.expired) {
          set({ isAuthenticated: false });
        }
      });
    } catch (error) {
      console.error("[AuthStore] Initialize error:", error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "认证初始化失败",
      });
    }
  },

  // 登录
  login: async (returnUrl?: string) => {
    if (get().isRefreshing) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await authService.signinRedirect(returnUrl ? { returnUrl } : undefined);
    } catch (error) {
      console.error("[AuthStore] Login error:", error);
      set({ isLoading: false, error: "登录失败" });
    }
  },

  // 登出
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signoutRedirect();
    } catch (error) {
      console.error("[AuthStore] Logout error:", error);
      await authService.removeUser();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // 刷新 Token
  refreshToken: async () => {
    set({ isRefreshing: true });
    try {
      const user = await authService.signinSilent();
      if (user) {
        set({ user, isAuthenticated: true, isRefreshing: false });
      }
    } catch (error) {
      console.error("[AuthStore] Token refresh error:", error);
      set({ isRefreshing: false, error: "Token 刷新失败，请重新登录" });
    }
  },

  // 权限检查方法
  hasRole: (role: string) => {
    const { user } = get();
    return authService.hasRole(user, role);
  },

  hasAnyRole: (roles: string[]) => {
    const { user } = get();
    return authService.hasAnyRole(user, roles);
  },

  getRoles: () => {
    const { user } = get();
    return authService.getUserRoles(user);
  },
}));
