import { UserManagerSettings, WebStorageStateStore } from "oidc-client-ts";

/**
 * OIDC/Keycloak 配置
 */
export const authConfig: UserManagerSettings = {
  // Keycloak Realm URL
  authority:
    import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/flowlet",

  // Keycloak Client ID
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "flowlet-app",

  // 回调地址
  redirect_uri: `${window.location.origin}/callback`,

  // 登出后跳转地址
  post_logout_redirect_uri: window.location.origin,

  // 授权类型
  response_type: "code",

  // HTTP + IP 访问时可能没有 secure context，禁用 PKCE 以避免 crypto.subtle 报错
  disablePKCE: !(window.isSecureContext && !!window.crypto?.subtle),

  // 请求的权限范围
  // offline_access: 获取 refresh_token，用于无感刷新（不需要 iframe）
  // roles: 获取 Keycloak 角色信息
  scope: "openid profile email roles offline_access",

  // 自动静默刷新 Token
  automaticSilentRenew: true,

  // 静默刷新超时时间（秒）
  silentRequestTimeoutInSeconds: 15,

  // 加载用户信息
  loadUserInfo: true,

  // Token 过期前多少秒触发刷新
  accessTokenExpiringNotificationTimeInSeconds: 60,

  // 使用 localStorage 存储状态
  userStore: new WebStorageStateStore({ store: window.localStorage }),

  // 禁用 session 监控（避免 iframe 相关问题）
  monitorSession: false,

  // 包含 ID Token
  includeIdTokenInSilentRenew: true,

  // 关键配置：禁用 iframe，强制使用 refresh_token
  // 不设置 silent_redirect_uri，让 oidc-client-ts 使用 refresh_token 方式
};

/**
 * 权限角色定义
 */
export const ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];
