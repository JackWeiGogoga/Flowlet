import { UserManager, User, Log } from "oidc-client-ts";
import { authConfig } from "./authConfig";

// 开发环境启用日志
if (import.meta.env.DEV) {
  Log.setLogger(console);
  Log.setLevel(Log.INFO);
}

/**
 * 认证服务 - UserManager 单例封装
 *
 * 静默刷新说明：
 * - 使用 iframe 方式进行静默刷新，用户完全无感知
 * - token 会在过期前 2 分钟自动刷新
 * - 刷新成功后会触发 userLoaded 事件，自动更新状态
 */
class AuthService {
  private userManager: UserManager;
  private isRefreshing: boolean = false;

  constructor() {
    this.userManager = new UserManager(authConfig);

    // 监听事件
    this.userManager.events.addUserLoaded(this.onUserLoaded);
    this.userManager.events.addUserUnloaded(this.onUserUnloaded);
    this.userManager.events.addAccessTokenExpiring(this.onAccessTokenExpiring);
    this.userManager.events.addAccessTokenExpired(this.onAccessTokenExpired);
    this.userManager.events.addSilentRenewError(this.onSilentRenewError);
  }

  /**
   * 获取 UserManager 实例
   */
  public getUserManager(): UserManager {
    return this.userManager;
  }

  /**
   * 获取当前用户
   */
  public async getUser(): Promise<User | null> {
    return this.userManager.getUser();
  }

  /**
   * 发起登录 (跳转到 Keycloak 登录页)
   */
  public async signinRedirect(state?: unknown): Promise<void> {
    // 保存当前路径，登录后返回
    const returnUrl = window.location.pathname + window.location.search;
    return this.userManager.signinRedirect({
      state: { returnUrl, ...(state as object) },
    });
  }

  /**
   * 处理登录回调
   */
  public async signinRedirectCallback(): Promise<User> {
    return this.userManager.signinRedirectCallback();
  }

  /**
   * 静默刷新 Token
   * 使用 refresh_token 方式刷新，完全在后台进行，用户无感知
   */
  public async signinSilent(): Promise<User | null> {
    // 防止并发刷新
    if (this.isRefreshing) {
      console.log("[Auth] Silent renew already in progress, skipping...");
      return this.userManager.getUser();
    }

    this.isRefreshing = true;
    try {
      // 检查是否有 refresh_token
      const currentUser = await this.userManager.getUser();
      if (currentUser?.refresh_token) {
        console.log("[Auth] Using refresh_token for silent renew...");
      } else {
        console.warn(
          "[Auth] No refresh_token available, silent renew may fail"
        );
      }

      const user = await this.userManager.signinSilent();
      console.log("[Auth] Silent renew completed successfully");
      return user;
    } catch (error) {
      console.error("[Auth] Silent renew failed:", error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 发起登出
   */
  public async signoutRedirect(): Promise<void> {
    return this.userManager.signoutRedirect();
  }

  /**
   * 处理登出回调
   */
  public async signoutRedirectCallback(): Promise<void> {
    await this.userManager.signoutRedirectCallback();
  }

  /**
   * 清除本地存储的用户信息
   */
  public async removeUser(): Promise<void> {
    return this.userManager.removeUser();
  }

  /**
   * 获取 Access Token
   */
  public async getAccessToken(): Promise<string | null> {
    const user = await this.getUser();
    return user?.access_token || null;
  }

  /**
   * 检查是否已认证
   */
  public async isAuthenticated(): Promise<boolean> {
    const user = await this.getUser();
    return !!user && !user.expired;
  }

  /**
   * 从 Token 中解析用户角色
   * 优先从 id_token (profile) 读取，fallback 到 access_token
   */
  public getUserRoles(user: User | null): string[] {
    if (!user) return [];

    const roles: string[] = [];

    // 方式1：从 profile (id_token) 中获取角色 - 需要 Keycloak 配置 Mapper
    const profile = user.profile as Record<string, unknown>;
    const realmAccess = profile?.realm_access as
      | { roles?: string[] }
      | undefined;
    if (realmAccess?.roles) {
      roles.push(...realmAccess.roles);
    }

    // 方式2：Fallback - 从 access_token 中解析角色
    if (roles.length === 0 && user.access_token) {
      try {
        const payload = JSON.parse(atob(user.access_token.split(".")[1]));
        if (payload.realm_access?.roles) {
          roles.push(...payload.realm_access.roles);
        }
        if (payload.resource_access?.["flowlet-app"]?.roles) {
          roles.push(...payload.resource_access["flowlet-app"].roles);
        }
      } catch (error) {
        console.error("[Auth] Failed to parse access token roles:", error);
      }
    }

    return [...new Set(roles)]; // 去重
  }

  /**
   * 检查用户是否有指定角色
   */
  public hasRole(user: User | null, role: string): boolean {
    const roles = this.getUserRoles(user);
    return roles.some((r) => r.toLowerCase() === role.toLowerCase());
  }

  /**
   * 检查用户是否有任一角色
   */
  public hasAnyRole(user: User | null, roles: string[]): boolean {
    return roles.some((role) => this.hasRole(user, role));
  }

  // ==================== 事件处理 ====================

  private onUserLoaded = (): void => {
    // console.log(
    //   "[Auth] User loaded/refreshed:",
    //   user.profile?.preferred_username
    // );
    // 静默刷新成功后会触发此事件，状态会自动更新
    // 用户无需感知，页面不会刷新
  };

  private onUserUnloaded = (): void => {
    // console.log("[Auth] User unloaded");
  };

  private onAccessTokenExpiring = (): void => {
    // 这是一个通知事件，automaticSilentRenew 会自动处理刷新
    // 不需要手动调用 signinSilent，oidc-client-ts 会自动在 iframe 中刷新
    // console.log(
    //   "[Auth] Access token expiring, automatic silent renew will handle it..."
    // );
  };

  private onAccessTokenExpired = (): void => {
    console.warn("[Auth] Access token expired, attempting silent renew...");
    // 如果自动刷新没有成功，手动尝试一次
    if (!this.isRefreshing) {
      this.signinSilent().catch((error) => {
        console.error("[Auth] Silent renew after expiry failed:", error);
      });
    }
  };

  private onSilentRenewError = (error: Error): void => {
    console.error("[Auth] Silent renew error:", error);
    // 静默刷新失败，可能需要用户重新登录
    // 这里不直接跳转登录，让 API 拦截器处理
    // 常见原因：用户已在其他标签页登出、session 过期等
  };
}

// 导出单例
export const authService = new AuthService();
export default authService;
