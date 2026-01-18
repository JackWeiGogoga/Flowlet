/**
 * 功能开关配置
 * 用于控制功能的启用/禁用，方便后续扩展
 */

export const featureFlags = {
  /**
   * 多租户功能
   * - true: 显示租户切换器，支持多租户
   * - false: 隐藏租户切换器，单租户模式
   */
  multiTenant: false,

  /**
   * 多项目功能
   * - true: 显示项目选择器，支持多项目
   * - false: 隐藏项目选择器，单项目模式
   */
  multiProject: true,

  /**
   * 系统设置入口
   * - true: 显示系统设置菜单
   * - false: 隐藏系统设置菜单
   */
  showSettings: true,
} as const;

export type FeatureFlags = typeof featureFlags;
