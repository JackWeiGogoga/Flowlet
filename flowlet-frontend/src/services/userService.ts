import api from "./api";

/**
 * 用户信息接口
 */
export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
  expiresAt: number;
  emailVerified: boolean;
  locale: string;
  // 用户初始化状态
  initialized: boolean;
  defaultProjectId: string | null;
  defaultProjectName: string | null;
}

/**
 * 用户初始化结果
 */
export interface InitResult {
  newUser: boolean;
  defaultProjectId: string;
  defaultProjectName: string;
  message: string;
}

/**
 * 用户服务 API
 */
export const userService = {
  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo> {
    const response = await api.get<{ code: number; data: UserInfo }>(
      "/user/me"
    );
    return response.data.data;
  },

  /**
   * 初始化用户（首次登录时调用）
   * 会为新用户创建默认项目
   */
  async initialize(): Promise<InitResult> {
    const response = await api.post<{ code: number; data: InitResult }>(
      "/user/initialize"
    );
    return response.data.data;
  },

  /**
   * 检查用户是否已初始化
   */
  async isInitialized(): Promise<boolean> {
    const response = await api.get<{ code: number; data: boolean }>(
      "/user/initialized"
    );
    return response.data.data;
  },

  /**
   * 获取当前用户权限
   */
  async getPermissions(): Promise<string[]> {
    const response = await api.get<{ code: number; data: string[] }>(
      "/user/permissions"
    );
    return response.data.data;
  },
};

export default userService;
